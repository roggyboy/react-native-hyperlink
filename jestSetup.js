// jestSetup.js

// If global.performance doesn't exist, define it.
if (typeof global.performance === 'undefined') {
	global.performance = { now: Date.now };
} else {
	// Override the existing global.performance property to be writable.
	Object.defineProperty(global, 'performance', {
		configurable: true,
		writable: true,
		value: {
			// Preserve any existing properties if needed
			...global.performance,
			// Ensure a now() function is available
			now: global.performance.now || Date.now,
		},
	});
}
