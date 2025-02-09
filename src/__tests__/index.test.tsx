import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Hyperlink from '../Hyperlink';
import HyperlinkWrapper from '../Hyperlink';
import { Text } from 'react-native';

Object.defineProperty(global, 'performance', {
	writable: true,
});

describe('Hyperlink Component', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<Hyperlink>
				<Text>Test without link</Text>
			</Hyperlink>,
		);
		expect(getByText('Test without link')).toBeTruthy();
	});

	it('wraps URLs with clickable Text components', () => {
		const { getByText } = render(
			<Hyperlink>
				<Text>Visit https://example.com for more info</Text>
			</Hyperlink>,
		);
		const linkText = getByText('https://example.com');
		expect(linkText).toBeTruthy();
		fireEvent.press(linkText);
	});

	it('handles custom link text', () => {
		const { getByText } = render(
			<Hyperlink linkText='Click here'>
				<Text>Visit https://example.com for more info</Text>
			</Hyperlink>,
		);
		const linkText = getByText('Click here');
		expect(linkText).toBeTruthy();
		fireEvent.press(linkText);
	});
});

describe('HyperlinkWrapper Component', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<HyperlinkWrapper>
				<Text>Test without link</Text>
			</HyperlinkWrapper>,
		);
		expect(getByText('Test without link')).toBeTruthy();
	});

	it('handles link clicks with default handler', () => {
		const { getByText } = render(
			<HyperlinkWrapper>
				<Text>Visit https://example.com for more info</Text>
			</HyperlinkWrapper>,
		);
		const linkText = getByText('https://example.com');
		expect(linkText).toBeTruthy();
		fireEvent.press(linkText);
	});

	it('uses custom onPress handler if provided', () => {
		const onPressMock = jest.fn();
		const { getByText } = render(
			<HyperlinkWrapper onPress={onPressMock}>
				<Text>Visit https://example.com for more info</Text>
			</HyperlinkWrapper>,
		);
		const linkText = getByText('https://example.com');
		expect(linkText).toBeTruthy();
		fireEvent.press(linkText);
		expect(onPressMock).toHaveBeenCalledWith('https://example.com', 'https://example.com');
	});
});
