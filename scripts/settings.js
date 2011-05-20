var Settings = function () {
	this.settings = {};

	// Apply hardcoded defaults
	$.extend(this.settings, Settings.globalDefaultSettings);

	// Apply local installation defaults
	if (Settings.defaultSettings) {
		$.extend(this.settings, Settings.defaultSettings);
	}

	// Apply client-defined settings
	if (localStorage && localStorage['settings']) {
		$.extend(this.settings, localStorage['settings']);
	}
};

// This gets overwritten by config/config.js
Settings.defaultSettings = {};

// These are the hardcoded default settings
Settings.globalDefaultSettings = {
	// Currently, the recommended default fee is 0.1 BTC
	fee: 0.1,

	// By default we'll look for an exit node running on the same
	// host as the web server.
	exitNodeHost: location.host,
	exitNodePort: 3125
};

Settings.prototype.get = function (key, defValue) {
	if ("undefined" !== typeof this.settings[key] &&
		null !== this.settings[key]) {
		return this.settings[key];
	} else {
		return defValue;
	}
};

Settings.prototype.apply = function (newSettings) {
	for (var i in newSettings) {
		if (newSettings.hasOwnProperty(i)) {
			if (newSettings[i] != this.settings[i]) {
				var settingChangeEvent = jQuery.Event('settingsChange');
				settingChangeEvent.key = i;
				settingChangeEvent.oldValue = this.settings[i];
				settingChangeEvent.newValue = newSettings[i];

				this.settings[i] = newSettings[i];

				$(this).trigger(settingChangeEvent);
			}
		}
	}
};
