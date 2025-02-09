import React, { Component, ReactNode } from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import mdurl from 'mdurl';
import type { HyperlinkProps, HyperlinkState, ReactElementWithType } from './types'; // Ensure these types are defined correctly

const defaultLinkify = require('linkify-it')();
const { OS } = Platform;

class Hyperlink extends Component<HyperlinkProps, HyperlinkState> {
	static defaultProps: Partial<HyperlinkProps> = {
		linkify: defaultLinkify,
		injectViewProps: () => ({}),
	};

	constructor(props: HyperlinkProps) {
		super(props);
		this.state = { linkifyIt: props.linkify || defaultLinkify };
	}

	static getDerivedStateFromProps(
		nextProps: HyperlinkProps,
		prevState: HyperlinkState,
	): Partial<HyperlinkState> | null {
		if (nextProps.linkify !== prevState.linkifyIt) {
			return { linkifyIt: nextProps.linkify || defaultLinkify };
		}
		return null;
	}

	/**
	 * Recursively process children to wrap URL substrings with clickable Text components.
	 * Includes null checks to avoid null pointer exceptions.
	 */
	parseChildren = (children: ReactNode): ReactNode => {
		if (children === null || children === undefined) {
			return children;
		}
		return React.Children.map(children, child => {
			if (child === null || child === undefined) return child;
			// Check for valid child component.
			if (typeof child === 'string') {
				if (this.state.linkifyIt.pretest(child)) {
					return this.linkify(<Text style={this.props.style}>{child}</Text>);
				}
				return child;
			} else if (React.isValidElement(child)) {
				// If the element is a Text component with string children that pass the pretest, process it.
				if (
					child.type === Text &&
					typeof child.props.children === 'string' &&
					this.state.linkifyIt.pretest(child.props.children)
				) {
					return this.linkify(child);
				}
				// If the element has children, recursively process them.
				if (child.props && child.props.children) {
					return React.cloneElement(
						child,
						{ ...child.props },
						this.parseChildren(child.props.children),
					);
				}
				return child;
			}
			return child;
		});
	};

	/**
	 * Wraps URL substrings in a given Text component with clickable links.
	 * Checks that matches exist before processing.
	 */
	linkify = (component: ReactElementWithType): ReactElementWithType => {
		const { children } = component.props;
		if (
			typeof children !== 'string' ||
			!this.state.linkifyIt.pretest(children) ||
			!this.state.linkifyIt.test(children)
		) {
			return component;
		}

		// Remove key and ref so that they are not spread into the cloned element.
		const { key, ref, ...otherProps } = component.props;
		const componentProps = { ...otherProps }; // intentionally drop ref

		let elements: ReactNode[] = [];
		let lastIndex = 0;

		try {
			const matches = this.state.linkifyIt.match(children);
			if (!matches || matches.length === 0) {
				return component;
			}
			matches.forEach(({ index, lastIndex: matchLastIndex, text, url }) => {
				// Add any text before the match.
				if (index > lastIndex) {
					const nonLinkedText = children.substring(lastIndex, index);
					elements.push(nonLinkedText);
				}
				lastIndex = matchLastIndex;

				const linkText = this.props.linkText
					? typeof this.props.linkText === 'function'
						? this.props.linkText(url)
						: this.props.linkText
					: text;

				// Build press handlers.
				const clickHandlerProps: {
					onPress?: () => void;
					onLongPress?: () => void;
				} = {};
				if (OS !== 'web' && this.props.onLongPress) {
					clickHandlerProps.onLongPress = () => this.props.onLongPress?.(url, linkText);
				}
				if (this.props.onPress) {
					clickHandlerProps.onPress = () => this.props.onPress?.(url, linkText);
				}

				// Get extra props via injectViewProps and remove any "key" if present.
				const extraPropsRaw = this.props.injectViewProps
					? this.props.injectViewProps(url)
					: {};
				const extraProps = { ...extraPropsRaw } as any;
				if ('key' in extraProps) {
					delete extraProps.key;
				}

				elements.push(
					<Text
						key={`${url}-${index}`}
						{...componentProps}
						{...clickHandlerProps}
						style={[component.props.style, this.props.linkStyle]}
						{...extraProps}
					>
						{linkText}
					</Text>,
				);
			});
			// Append any remaining text after the last match.
			if (lastIndex < children.length) {
				elements.push(children.substring(lastIndex));
			}
			return React.cloneElement(component, componentProps, elements);
		} catch (err) {
			console.error('Error in linkify:', err);
			return component;
		}
	};

	render() {
		const { onPress, onLongPress, linkStyle, style, ...viewProps } = this.props;
		const parsedChildren = this.parseChildren(this.props.children) || this.props.children;
		// Check that parsedChildren is valid before rendering.
		if (!parsedChildren) {
			console.warn('No valid children to render.');
			return (
				<View
					{...viewProps}
					style={style}
				/>
			);
		}
		return (
			<View
				{...viewProps}
				style={style}
			>
				{parsedChildren}
			</View>
		);
	}
}

interface HyperlinkWrapperProps extends HyperlinkProps {}

export default class HyperlinkWrapper extends Component<HyperlinkWrapperProps> {
	constructor(props: HyperlinkWrapperProps) {
		super(props);
		this.handleLink = this.handleLink.bind(this);
	}

	/**
	 * Handles link clicks.
	 * Adds error handling for parsing URLs and opening them,
	 * and checks that Linking functions are available on the current platform.
	 */
	handleLink(url: string) {
		try {
			const urlObject = mdurl.parse(url);
			// Check that the urlObject is valid and not empty.
			if (!urlObject || (!urlObject.protocol && !urlObject.pathname)) {
				throw new Error(`Failed to parse URL: ${url}`);
			}
			if (urlObject.protocol) {
				urlObject.protocol = urlObject.protocol.toLowerCase();
			}
			const normalizedURL = mdurl.format(urlObject);

			// Verify that Linking functions are available.
			if (typeof Linking.canOpenURL !== 'function' || typeof Linking.openURL !== 'function') {
				console.warn('Linking functions are not available on this platform.');
				return;
			}

			Linking.canOpenURL(normalizedURL)
				.then(supported => {
					if (supported) {
						Linking.openURL(normalizedURL).catch(err => {
							console.error('Error opening URL:', err);
						});
					} else {
						console.warn('URL is not supported:', normalizedURL);
					}
				})
				.catch(err => {
					console.error('Error checking URL support:', err);
				});
		} catch (err) {
			console.error('Error in handleLink:', err);
		}
	}

	render() {
		// Use the external onPress if provided; otherwise, fall back to handleLink.
		const onPress = this.props.onPress || this.handleLink;
		return this.props.linkDefault ? (
			<Hyperlink
				{...this.props}
				onPress={onPress}
			/>
		) : (
			<Hyperlink {...this.props} />
		);
	}
}
