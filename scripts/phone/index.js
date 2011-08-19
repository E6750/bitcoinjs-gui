define([
  "jquery",
  "../walletmanager",
  "../exitnode",
  "./txview",
  "../bindings",

  // Supported wallet types
  "../wallets/miniwallet"
], function ($, WalletManager, ExitNode, TransactionView, setCommonBindings) {

$(function () {
  $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'scripts/vendor/sencha-touch-1.1.0/sencha-touch.css') );
  $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href', 'stylesheets/phone/style.css') );

});
new Ext.Application({
  launch: function() {
    // Options for autoNumeric to render BTC amounts
    var autoNumericBtc = {
      aSep: '',
      aSign: "",
      mDec: 8,
      aPad: 2
    };

    var addressQrOpts = {
      typeNumber: 6,
      correctLevel: 0, // QRErrorCorrectLevel.M
      width: 246,
      height: 246
    };

    Ext.regModel('Transaction', {
      fields: ['status', "symbol", "addr", "date"]
    });
    var transactionStore = new Ext.data.Store({
      model: 'Transaction',
      data: []
    });

    // Initialize wallet system
    var cfg = new Settings();
    var wm = new WalletManager();
    var txDb = new TransactionDatabase(); // Tx chain
    var txMem = new TransactionDatabase(); // Memory pool
    var txView = new TransactionView(transactionStore);

    var exitNodeHost = cfg.get('exitNodeHost');
    var exitNodePort = cfg.get('exitNodePort');
    var exitNodeSecure = cfg.get('exitNodeSecure');
    var exitNode = new ExitNode(exitNodeHost, +exitNodePort, !!exitNodeSecure,
                                txDb, txMem, txView);

    setCommonBindings(cfg, wm, txDb, txMem, txView, exitNode);

    Ext.regModel('Wallet', {
      fields: [
        {
          name: 'index',
          type: 'number'
        },
        'name',
        'type',
        {
          name: 'humanType',
          type: 'string',
          convert: function (v, record) {
            return WalletManager.getHumanType(record.get('type'));
          }
        },{
          name: 'status',
          type: 'string',
          convert: function (v, record) {
            var test = false;
            if (wm.activeWallet) {
              test = wm.activeWallet.name == record.get('name');
            }
            return test ?
              "active" :
              "available";
          }
        }
      ]
    });
    var walletListStore = new Ext.data.Store({
      model: 'Wallet',
      getGroupString: function(record) {
        return record.get('status') === 'active' ?
          'Active Wallet' :
          'Available Wallets';
      },
      sorters: [{
        property: 'status',
        direction: 'ASC'
      }, {
        property: 'name',
        direction: 'DESC'
      }],
      data: wm.getWalletsInfo()
    });

    Ext.regModel('WalletType', {
      fields: ['humanName', 'humanDesc']
    });
    var walletTypesStore = new Ext.data.Store({
      model: 'WalletType',
      data: WalletManager.getTypeArray()
    });

    $(wm).bind('walletListUpdate', function () {
      walletListStore.loadData(wm.getWalletsInfo());
    });

    var CurrencyField = Ext.extend(Ext.form.Text, {
      initComponent: function() {
        CurrencyField.superclass.initComponent.apply(this, arguments);
      },

      onRender: function () {
        CurrencyField.superclass.onRender.apply(this, arguments);

        var el = $(this.el.dom);
        el.append('<div class="x-currency">BTC</div>');
        this.el.addCls('x-field-currency');

        var leftPadding = el.find('.x-currency').width() + 10;
        el.find('input').css('padding-left', ""+leftPadding+"px");
      }
    });
    Ext.reg('currencyfield', CurrencyField);

    new Ext.Panel({
      id: 'master',
      fullscreen: true,
      layout: 'card',

      items: [{
        id: 'view_main',
        xtype: 'tabpanel',

        layoutOnTabChange: true,

        dockedItems: [{
          xtype: 'toolbar',
          dock: 'top',
          title: "Webcoin",
          items: [{
            text: 'Wallets',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_wallets');
            }
          }]
        }],

        tabBar: {
          dock: 'bottom',
          layout: {
            pack: 'center'
          }
        },
        items: [{
          id: 'tabpane_status',
          title: 'Status',
          iconCls: 'user',
          layout: {
            type: 'vbox',
            align: 'stretch'
          },
          items: [{
            height: 70,
            layout: {
              type: 'hbox',
              align: 'stretch'
            },
            items: [{
              id: "status_wallet",
              layout: 'card',
              flex: 1,
              items: [{
                layout: {
                  type: "vbox",
                  align: "stretch"
                },
                items: [{
                  id: "status_noactive",
                  height: 33,
                  padding: "5 0 0 14",
                  html: "No active wallet"
                }]
              },{
                layout: {
                  type: "vbox",
                  align: "stretch"
                },
                items: [{
                  layout: "hbox",
                  height: 33,
                  items: [{
                    id: "status_walletname",
                    padding: "3 0 0 14",
                    html: "Unnamed Wallet"
                  }]
                },{
                  id: "status_amount",
                  padding: "0 0 0 14",
                  height: 37,
                  html: '<span class="currency">BTC</span> <span class="value">...</span>'
                }]
              }]
            }]
          },{
            html: 'Transactions',
            cls: 'x-list-header'
          },{
            flex: 1,
            xtype: 'list',
            cls: 'txlist',
            store: transactionStore,
            itemTpl: '<div class="tx {status}"><div class="impact">{impact}</div><span class="date">{date}</span> <span class="symbol">{symbol}</span> <span class="addr">{addr}</span></div>',
            emptyText: '<div class="empty-list-note"><div>No transactions</div></div>'
          }]
        },{
          id: 'tabpane_receive',
          title: 'Receive',
          iconCls: 'download',
          scroll: 'vertical',
          layout: {
            type: 'vbox',
            align: 'stretch'
          },
          items: [{
            html: 'Requested amount <span class="grey">(optional)</span>',
            cls: 'subsection',
            padding: "10 10 5 10"
          },{
            xtype: 'currencyfield',
            margin: "0 10 0 10",
            listeners: {
              afterrender: function (c) {
                $(c.el.dom).find('input').autoNumeric(autoNumericBtc);
              }
            }
          },{
            html: 'Your address',
            cls: 'subsection',
            margin: "10 10 0 10"
          },{
            id: 'receive_address',
            xtype: 'textfield',
            value: '...',
            padding: "5 10 5 10",
            listeners: {
              change: resetReceiveAddress,
              keyup: resetReceiveAddress,
              click: {
                element: 'el',
                fn: function (e) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.target.focus();
                  e.target.setSelectionRange(0, 9999);
                }
              }
            }
          },{
            html: "QR code",
            cls: 'subsection',
            padding: "5 10 5 10"
          },{
            id: 'receive_qrcode',
            height: 51,
            margin: "0 10 0 10",
            padding: 5,
            html: '<img src="images/dummy_qr.jpg"/> Tap to show QR code',
            listeners: {
              afterrender: function (c) {
                c.el.on('click', function() {
                  if (!wm.activeWallet) {
                    return;
                  }
                  if (!this.popup) {
                    var popup = this.popup = new Ext.Panel({
                      id: 'receive_qrcode_popup',
                      cls: 'qr-popup',
                      floating: true,
                      modal: true,
                      centered: true,
                      width: 320,
                      height: 320,
                      listeners: {
                        afterrender: function (c) {
                          c.el.on('click', function() {
                            popup.hide();
                          });
                        }
                      }
                    });
                  }
                  this.popup.show('pop');

                  var wallet = wm.activeWallet.wallet;
                  var address = ""+wallet.getCurAddress();

                  var url = "bitcoin:"+address;

                  $('#receive_qrcode_popup .x-panel-body')
                    .empty()
                    .qrcode($.extend({}, addressQrOpts, {text: url}))
                  ;
                });
              }
            }
          },{
            html: "Email payment request",
            cls: 'subsection',
            padding: "10 10 5 10"
          },{
            xtype: 'button',
            text: 'Send Email',
            margin: "5 10 10 10",
            handler: function () {
              var wallet = wm.activeWallet.wallet;
              var address = ""+wallet.getCurAddress();

              var subject = "Bitcoin Payment Request";
              var body = "This is a request to send bitcoins to my Webcoin mobile wallet.%0A%0AAddress: "+address;

              var mailLink = "mailto:";
              mailLink += "?subject="+subject;
              mailLink += "&body="+body;

              window.location = mailLink;
            }
          }],
          listeners: {
            activate: function () {
              if (!wm.activeWallet) {
                Ext.getCmp('master').setActiveItem('view_main');
                return;
              }

              var wallet = wm.activeWallet.wallet;
              var address = ""+wallet.getCurAddress();

              Ext.getCmp('receive_address').setValue(address);
            },
            afterrender: function (c) {
              c.doLayout();
            }
          }
        },{
          id: 'view_send',
          title: 'Send',
          iconCls: 'upload',
          padding: '0 10 0 10',
          layout: {
            type: 'vbox',
            align: 'stretch'
          },
          scroll: 'vertical',
          items: [{
            html: 'Pay to <span class="grey">(address or url)',
            cls: 'subsection',
            margin: "10 0 5 0"
          },{
            id: 'send_rcpt',
            xtype: 'textfield',
            listeners: {
              blur: function (c) {
                parseRcptVal(c.getValue());
              }
            }
          },{
            id: 'send_amount_label',
            html: 'Amount <span class="grey">(up to ...)</span>',
            cls: 'subsection',
            margin: "10 0 5 0"
          },{
            id: 'send_amount',
            xtype: 'currencyfield',
            listeners: {
              afterrender: function (c) {
                $(c.el.dom).find('input').autoNumeric(autoNumericBtc);
              }
            }
          },{
            html: 'Fee',
            cls: 'subsection',
            margin: "10 0 5 0"
          },{
            id: 'send_fee',
            xtype: 'currencyfield',
            listeners: {
              afterrender: function (c) {
                $(c.el.dom).find('input').autoNumeric(autoNumericBtc);
              }
            }
          },{height: 10},{
            xtype: 'button',
            text: 'Send Bitcoins',
            ui: 'confirm',
            handler: function () {
              var rcptString = Ext.getCmp('send_rcpt').getValue();
              var valueString = Ext.getCmp('send_amount').getValue();
              var feeString = Ext.getCmp('send_fee').getValue();

		          function validateError(msg) {
			          Ext.Msg.alert('Validation Error', msg, Ext.emptyFn);
		          };

              if (!wm.activeWallet) {
                validateError("No active wallet.");
			          return;
              }

              var wallet = wm.activeWallet.wallet;

		          // Safe conversion from double to BigInteger
		          if (!valueString) {
			          validateError("Please enter an amount.");
			          return;
		          }
              var value = Bitcoin.Util.parseValue(valueString);
		          if (value.compareTo(BigInteger.ZERO) <= 0) {
			          validateError("Please enter a positive amount of Bitcoins.");
			          return;
		          }

		          var rcpt = rcptString;

		          // Trim address
		          rcpt = rcpt.replace(/^\s+/, "").replace(/\s+$/, "");

		          if (!rcpt.length) {
			          validateError("Please enter the Bitcoin address of the recipient.");
			          return;
		          }

		          try {
			          var pubKeyHash = Bitcoin.Address.decodeString(rcpt);
		          } catch (e) {
			          validateError("Bitcoin address invalid, please double-check.");
			          return;
		          }

		          // Safe conversion from double to BigInteger
		          if (!feeString) {
			          feeString = "0.00";
		          }
              var fee = Bitcoin.Util.parseValue(feeString);
		          if (value.compareTo(BigInteger.ZERO) < 0) {
			          validateError("Please enter a positive fee or zero.");
			          return;
		          }

		          if (value.add(fee).compareTo(wallet.getBalance()) > 0) {
			          validateError("You have insufficient funds for this transaction.");
			          return;
		          }

              Ext.getCmp('sendconfirm_rcpt').update(rcpt);
              Ext.getCmp('sendconfirm_amount').update(Bitcoin.Util.formatValue(value));
              Ext.getCmp('sendconfirm_fee').update(Bitcoin.Util.formatValue(fee));
              Ext.getCmp('master').setActiveItem('view_sendconfirm');
              Ext.getCmp('sendconfirm_submit').on('tap', function () {
                var tabPanel = Ext.getCmp('master');
                tabPanel.on('cardswitch', function () {
                  $('#view_sending .action').text("Signing transaction...");
                  setTimeout(function () {
                    if (!wm.activeWallet) {
                      Ext.getCmp('master').setActiveItem('view_main');
                      validateError("Wallet disengaged while preparing transaction.");
                      return;
                    }
                    var wallet = wm.activeWallet.wallet;
			              var tx = wallet.createSend(new Bitcoin.Address(rcpt),value,fee);
			              var txBase64 = Crypto.util.bytesToBase64(tx.serialize());

			              var txHash = Crypto.util.bytesToBase64(tx.getHash());
			              $(exitNode).bind('txNotify', function (e) {
				              if (e.tx.hash == txHash) {
					              // Our transaction
                        Ext.getCmp('master').setActiveItem('view_main');
                        Ext.getCmp('view_main').setActiveItem('tabpane_status');
					              $(exitNode).unbind('txNotify', arguments.callee);
				              }
			              });

                    $('#view_sending .action').text("Sending transaction...");
                    exitNode.call("txSend", {tx: txBase64}, function (err) {
				              if (err) {
                        Ext.getCmp('master').setActiveItem('view_main');
					              validateError("Error sending transaction: " +
								                      data.error.message);
					              return;
				              }
				              $('#view_sending .action').text("Awaiting reply...");
			              });
                  }, 100);
                }, null, {single: true});
                tabPanel.setActiveItem('view_generatingwallet');
              }, null, {single: true});
            }
          },{height: 10}],
          listeners: {
            afterrender: function (c) {
              c.doLayout();
            },
            activate: function () {
              var valueString = getCurrentBalanceString();
              $('#send_amount_label .grey').text("(up to "+valueString+")");
              Ext.getCmp('send_fee').setValue(cfg.get('fee'));
            }
          }
        },{
          title: 'About',
          iconCls: 'info',
          contentEl: 'about'
        }]
      },{
        id: 'view_wallets',
        layout: 'fit',

        items: [{
          xtype: 'list',
          store: walletListStore,
          grouped: true,
          itemTpl: '<div class="wallet {status}"><div class="action switch x-button">Switch</div> <div class="action delete x-button x-button-decline">Delete</div><div class="name">{name}</div><div class="type">{humanType}</div></div>',
          emptyText: '<div class="empty-list-note"><div>No wallets instealled. Please use the + icon in the top right to create one.</div></div>',
          listeners: {
            itemtap: function (c, index, item, e) {
              var store = this.store;
              if (e.getTarget('.swiped div.delete')) {
                Ext.Msg.confirm("Delete Wallet", 'You are about to <div class="danger">IRREVOCABLY DELETE</div> this wallet. Are you sure?', function (answer) {

                  if (answer !== "yes") {
                    return;
                  }
                  wm.deleteWallet(index);

                  store.removeAt(index);
                  store.sync();
                });
              } else if (e.getTarget('div.switch')) {
                wm.setActiveWallet(store.getAt(index).get('index'));
                Ext.getCmp('master').setActiveItem('view_main');
                Ext.getCmp('view_main').setActiveItem('tabpane_status');
              } else {
                deactivateWalletListItems();

                // TODO: Wallet tapped, show details
              }
            },
            itemswipe: function (list, index, node) {
              var el        = Ext.get(node),
                  hasClass  = el.hasCls('swiped');

              deactivateWalletListItems();

              if (hasClass) {
                el.removeCls('swiped');
              } else {
                el.addCls('swiped');
              }
            },
            containertap: deactivateWalletListItems
          }
        }],

        dockedItems: [{
          xtype: 'toolbar',
          dock: 'top',
          title: "My Wallets",
          items: [{
            text: 'Back',
            ui: 'back',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_main');
            }
          },{xtype: 'spacer'},{
            iconMask: true,
            iconCls: 'add',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_addwallet');
            }
          }]
        }]
      },{
        id: 'view_addwallet',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },

        items: [{
          xtype: 'list',
          store: walletTypesStore,
          itemTpl: '<div class="name">{humanName}</div><div class="desc">{humanDesc}</div>',
          flex: 1,
          onItemDisclosure: function (record, button, index) {
            switch (record.get('id')) {
            case "mini":
              Ext.getCmp('master').setActiveItem('view_createminiwallet');
            }
          },
          listeners: {
            itemtap: function (list, index) {
              var record = list.store.getAt(index);
              switch (record.get('id')) {
              case "mini":
                Ext.getCmp('master').setActiveItem('view_createminiwallet');
              }
            }
          }
        },{
          html: "Select a wallet type",
          cls: "uitip",
          padding: "10 0 10 0"
        }],

        dockedItems: [{
          xtype: 'toolbar',
          dock: 'top',
          title: "Create Wallet",
          items: [{
            text: 'Back',
            ui: 'back',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_wallets');
            }
          }]
        }]
      },{
        id: 'view_createminiwallet',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        bodyPadding: '0 10 0 10',
        items: [{
          html: 'Wallet Name <span class="grey">(recommended)</span>',
          cls: 'subsection',
          margin: "10 0 5 0"
        },{
          id: "createminiwallet_name",
          xtype: 'textfield',
          placeHolder: 'Give this wallet a label, e.g. Cash'
        },{height: 10},{
          xtype: 'button',
          text: 'Create Wallet',
          ui: 'confirm',
          handler: function () {
            $('#createminiwallet_keyhide input').focus();
            var nameField = Ext.getCmp('createminiwallet_name');
            var name = nameField.getValue();
            name = $.trim(name);
            if (!name.length) name = "Wallet";

            var tabPanel = Ext.getCmp('master');
            tabPanel.on('cardswitch', function () {
              setTimeout(function () {
                wm.createWallet({
                  type: 'mini',
                  name: name
                });
                Ext.getCmp('master').setActiveItem('view_main');
              }, 100);
            }, null, {single: true});
            tabPanel.setActiveItem('view_generatingwallet');
          }
        },{
          /* Invisible checkbox so we can hide the keyboard on demand */
          id: 'createminiwallet_keyhide',
          html: '<input type="checkbox" style="opacity: 0">'
        }],

        dockedItems: [{
          xtype: 'toolbar',
          dock: 'top',
          title: "New Mini Wallet",
          items: [{
            text: 'Back',
            ui: 'back',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_addwallet');
            }
          }]
        }]
      },{
        id: 'view_generatingwallet',
        cls: 'patiencescreen',
        html: '<div class="container"><div class="action">Generating wallet...</div><div class="note">This may take a few moments, thank you for your patience.</div></div>'
      },{
        id: 'view_sendconfirm',
        padding: '0 10 0 10',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        scroll: 'vertical',
        items: [{
          html: 'Payment to',
          cls: 'subsection',
          margin: "10 0 5 0"
        },{
          id: 'sendconfirm_rcpt',
          html: '...'
        },{
          html: 'Amount',
          cls: 'subsection',
          margin: "10 0 5 0"
        },{
          id: 'sendconfirm_amount',
          html: '...'
        },{
          html: 'Fee',
          cls: 'subsection',
          margin: "10 0 5 0"
        },{
          id: 'sendconfirm_fee',
          html: '...'
        },{height: 10},{
          layout: 'hbox',
          items: [{
            flex: 1,
            xtype: 'button',
            text: 'Cancel',
            ui: 'decline',
            handler: function () {
              Ext.getCmp('master').setActiveItem('view_main');
            }
          },{width: 10},{
            id: 'sendconfirm_submit',
            width: 160,
            xtype: 'button',
            text: 'Send Bitcoins',
            ui: 'confirm'
          }]
        },{height: 10}]
      },{
        id: 'view_sending',
        cls: 'patiencescreen',
        html: '<div class="container"><div class="action">Sending coins...</div><div class="note">This may take a few moments, thank you for your patience.</div></div>'
      },{
        id: 'view_welcome',
        cls: 'htmlview',
        layout: 'vbox',
        items: [{
          html: "<h3>Welcome to Webcoin!</h3><p>It's a Bitcoin wallet that lives in your phone. You're looking at the first functional prototype. Use at your own risk!</p>",
          padding: 10
        },{
          xtype: 'button',
          text: 'Create My First Wallet',
          ui: 'confirm',
          margin: '0 10 10 10',
          handler: function () {
            Ext.getCmp('master').setActiveItem('view_createminiwallet');
          }  
        }],

        dockedItems: [{
          xtype: 'toolbar',
          dock: 'top',
          title: "Webcoin"
        }]
      }]
    });

    $(wm).bind('walletInit', function (e) {
      // Update wallet status indicator on status screen
      Ext.getCmp('status_wallet').setActiveItem(1);
      Ext.getCmp('status_walletname').update(e.newWallet.name);

      // Enable send/receive screens
      var tabBar = Ext.getCmp('view_main').getTabBar();
      tabBar.getComponent(1).setDisabled(false);
      tabBar.getComponent(2).setDisabled(false);

      walletListStore.loadData(wm.getWalletsInfo());
    });
    $(wm).bind('walletDeinit', function (e) {
      // Update wallet status indicator on status screen
      Ext.getCmp('status_wallet').setActiveItem(0);

      // Disable send/receive screens
      var tabBar = Ext.getCmp('view_main').getTabBar();
      tabBar.getComponent(1).setDisabled(true);
      tabBar.getComponent(2).setDisabled(true);
    });

    function parseQuery(subject) {
      var nvpair = {};
      var qs = subject.replace('?', '');
      var pairs = qs.split('&');
      $.each(pairs, function(i, v){
        var pair = v.split('=');
        nvpair[pair[0]] = pair[1];
      });
      return nvpair;
    };

    function parseRcptVal(val) {
      if ("string" !== typeof val) {
        return;
      }
      var url = null;
      var address = null;
      var amount = null;
      if (val.slice(0, 8) === 'bitcoin:') {
        url = val.slice(8);
      } else if (val.slice(0, 19) === 'https://btc.io/pay/') {
        url = val.slice(19);
      }

      if (url) {
        var pieces = url.split('?');
        address = pieces[0];
        if (pieces.length == 2) {
          var query = parseQuery(pieces[1]);
          if (query.amount) {
            amount = query.amount;
          }
        } else if (pieces.length > 2) {
          return;
        }
      }

      if (address) {
        Ext.getCmp('send_rcpt').setValue(address);
      }

      if (amount) {
        Ext.getCmp('send_amount').setValue(amount);
      }
    };

    function getCurrentBalanceString() {
      var valueString = "...";
      if (wm.activeWallet) {
        valueString = Bitcoin.Util.formatValue(wm.activeWallet.wallet.getBalance());
      }
      return valueString;
    };

    function deactivateWalletListItems() {
      $('#view_wallets .x-list-item').removeClass('swiped');
    };

    function resetReceiveAddress() {
      if (wm.activeWallet) {
        var wallet = wm.activeWallet.wallet;
        var address = ""+wallet.getCurAddress();
        Ext.getCmp('receive_address').setValue(address);
      }
    };

    $(exitNode).bind('txData txAdd txNotify', function (e) {
      var valueString = getCurrentBalanceString();
      $('#status_amount .value').text(valueString);
    });

    wm.init(function () {
      
      var queryItems = window.location.search.substr(1).split("&");
      var amount = 0, address = 0, item;
      for (var i=0; i < queryItems.length; i++) {
        item = queryItems[i];
        if (item.indexOf("amount=") == 0) {
          amount = item.split('=')[1];
        }
        if (item.indexOf("address=") == 0) {
          address = item.split('=')[1];
        }
      }
      
      if (!wm.wallets.length) {
        // For new users, automatically take them to the wallet creation
        // wizard.
        Ext.getCmp('master').setActiveItem('view_welcome');
      }
      else {
        if (amount && address) {
          Ext.getCmp('master').setActiveItem('view_main');
          Ext.getCmp('view_main').setActiveItem('view_send');
          document.getElementsByName('send_rcpt')[0].value = address;
          document.getElementsByName('send_amount')[0].value = amount;
        }
      }
    });
  }
});

});
