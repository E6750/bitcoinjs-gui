var Settings = function () {
	this.settings = {};

	// Apply hardcoded defaults
	$.extend(this.settings, Settings.globalDefaultSettings);

	// Apply local installation defaults
	if (Settings.defaultSettings) {
		$.extend(this.settings, Settings.defaultSettings);
	}

	// Apply client-defined settings
	if (localStorage) {
		if (localStorage['settings']) {
			try {
				this.persistentSettings = JSON.parse(localStorage['settings']);

				if ("object" !== typeof this.persistentSettings) {
					this.persistentSettings = {};
				}
			} catch (e) {
				console.error(e);
				this.persistentSettings = {};
			}
			$.extend(this.settings, this.persistentSettings);
		} else {
			this.persistentSettings = {};
		}
	}
};

// This gets overwritten by config/config.js
Settings.defaultSettings = {};

// These are the hardcoded default settings
Settings.globalDefaultSettings = {
	// Currently, the minimum fee is 0.0005 BTC
	fee: "0.0005",

	// By default we'll look for an exit node running on the same
	// host as the web server.
	exitNodeHost: location.host,
	exitNodePort: 3125,
	exitNodeSecure: false
};

/**
 * These functions sanitize the value for a setting.
 *
 * Note that they're also used for validation: If a value does not
 * follow the correct format, it throws an exception.
 */
Settings.normalizer = {

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
				var settingChangeEvent = jQuery.Event('settingChange');
				settingChangeEvent.key = i;
				settingChangeEvent.oldValue = this.settings[i];
				settingChangeEvent.newValue = newSettings[i];

				this.settings[i] = newSettings[i];
				this.persistentSettings[i] = newSettings[i];

				$(this).trigger(settingChangeEvent);
			}
		}
	}

	this.save();
};

Settings.prototype.save = function () {
	if (localStorage) {
		localStorage['settings'] = JSON.stringify(this.persistentSettings);
	}
};
