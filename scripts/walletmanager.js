define(function () {
  var WalletManager = function () {
	  this.activeWallet = null;
    this.wallets = [];
    this.walletIndex = {};

    this.initialized = false;
  };

  WalletManager.prototype.init = function (callback) {
    var self = this;

    // Never send the keys to the server
    Persist.remove('cookie');

    this.dataStore = new Persist.Store('WebcoinStore');

    console.log(Persist.type);

    var walletsList = this.dataStore.get('data', function (ok, data) {
      data = JSON.parse(data);
      if (data && data.wallets) {
        var wallets = data.wallets;
        var walletsObjs = self.deserialize(wallets);

        for (var i = 0, l = walletsObjs.length; i < l; i++) {
          console.log(walletsObjs);
          self.addWallet(walletsObjs[i]);
        }

        if ("number" === typeof data.active &&
            data.active <= self.wallets.length &&
            data.active >= 0) {
          self.setActiveWallet(data.active);
	      } else if (self.wallets.length) {
          self.setActiveWallet(0);
	      }

        try {
          // Migrate (very) old wallet data
          if (localStorage.wallet) {
            self.createWallet({
              type: 'mini',
              name: "Restored Wallet",
              keys: localStorage.wallet
            });
          }
        } catch (e) {}

        if (!self.wallets.length) {
          // No wallet found
          var deinitEvent = jQuery.Event('walletDeinit');
          deinitEvent.oldWallet = null;
          deinitEvent.newWallet = null;
          deinitEvent.manager = self;
          $(self).trigger(deinitEvent);
        }
      }

      $(self).trigger('walletListUpdate');

      this.initialized = true;

      if ("function" === typeof callback) {
        callback(self);
      }
    });
  };

  WalletManager.prototype.save = function () {
    var data = {};
    data.wallets = this.serialize();

    var activeIndex = this.wallets.indexOf(this.activeWallet);
    if ("number" === typeof activeIndex && activeIndex >= 0) {
      data.active = activeIndex;
    }

    data = JSON.stringify(data);
    this.dataStore.set('data', data);
  };

  WalletManager.prototype.deserialize = function (wallets) {
    if (!wallets) return [];

    var walletsObjs = [];

    for (var i = 0, l = wallets.length; i < l; i++) {
      try {
        walletsObjs.push(this.deserializeWallet(wallets[i]));
      } catch (err) {
        console.error(err);
      }
    }

    return walletsObjs;
  };

  WalletManager.prototype.deserializeWallet = function (data) {
    if (WalletManager.types[data.type]) {
      return new WalletManager.types[data.type](data);
    } else {
      return undefined;
    }
  };

  WalletManager.prototype.serialize = function () {
    var walletArray = [];

    for (var i = 0, l = this.wallets.length; i < l; i++) {
      try {
        walletArray.push(this.wallets[i].serialize());
      } catch (err) {
        console.error(err);
      }
    }

    return walletArray;
  };

  /**
   * Returns wallets information.
   *
   * This function creates an array of objects containing metadata about each of
   * the wallets.
   */
  WalletManager.prototype.getWalletsInfo = function () {
    var wallets = [];

    for (var i = 0, l = this.wallets.length; i < l; i++) {
      try {
        var wallet = this.wallets[i];
        wallets.push({
          index: i,
          name: wallet.name,
          type: wallet.type,
          humanName: wallet.humanName
        });
      } catch (err) {
        // TODO: Log this
      }
    }

    return wallets;
  };

  WalletManager.prototype.addWallet = function (wallet) {
    var self = this;

    // Make sure name is unique
    var enumString = "", num = 2;
    while (this.walletIndex[wallet.name+enumString]) {
      enumString = " " + num++;
    }
    if (enumString.length) wallet.name += enumString;

    this.wallets.push(wallet);
    this.walletIndex[wallet.name] = wallet;

    $(wallet).bind('walletChanged', function () {
      // Save everything whenever a wallet changes.
      // TODO: Implement walletChanged in bitcoinjs-lib
      self.save();
    });
  };

  WalletManager.prototype.createWallet = function (data) {
	  var self = this;

	  // Create the new wallet
    var wallet;
    if (WalletManager.types[data.type]) {
      wallet = new WalletManager.types[data.type](data);
    } else {
      throw new Error('Invalid wallet type');
    }

    this.addWallet(wallet);

    this.setActiveWallet(wallet);

    $(this).trigger('walletListUpdate');

    this.save();
  };

  WalletManager.prototype.deleteWallet = function (index) {
    if ("number" !== typeof index || index >= this.wallets.length || index < 0) {
      return;
    }
    this.wallets.splice(index, 1);
    $(this).trigger('walletListUpdate');
    this.save();
  };

  WalletManager.prototype.setActiveWallet = function (newWallet) {
    var self = this;

    if ("number" === typeof newWallet) {
      newWallet = this.wallets[newWallet];
    }

    if (!newWallet) return;

    var commonEventProps = {
      oldWallet: this.activeWallet,
      newWallet: newWallet,
      manager: this
    };

	  // Send a notification that the current wallet is going to be disabled
	  if (self.activeWallet) {
      var deinitEvent = jQuery.Event('walletDeinit');
      $.extend(deinitEvent, commonEventProps);
		  $(self).trigger(deinitEvent);
		  self.activeWallet = null;
	  }

    // Send an event about activation of the new wallet
    this.activeWallet = newWallet;
    var initEvent = jQuery.Event('walletInit');
    $.extend(initEvent, commonEventProps);
    $(self).trigger(initEvent);

    // Save new active wallet
    this.save();
  };

  WalletManager.prototype.getWalletByName = function (name) {
    return this.walletIndex[name];
  };

  WalletManager.types = {};

  WalletManager.reg = function (name, cls) {
    if ("string" !== typeof name) {
      throw new Error("Wallet type registration failed, invalid key");
    }
    if ("function" !== typeof cls) {
      throw new Error("Wallet type registration failed, invalid class");
    }
    WalletManager.types[name] = cls;
    cls.id = name;
  };

  /**
   * Get a human-readable name for a wallet type ID.
   */
  WalletManager.getHumanType = function (id) {
    return WalletManager.types[id].humanName;
  };

  WalletManager.getTypeArray = function () {
    var types = WalletManager.types;
    var typesArray = [];

    for (var i in types) {
      if (types.hasOwnProperty(i)) {
        typesArray.push({
          id: i,
          humanName: types[i].humanName,
          humanDesc: types[i].humanDesc
        });
      }
    }

    return typesArray;
  };

  return WalletManager;
});
