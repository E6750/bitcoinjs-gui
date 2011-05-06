var ExitNode = function (serverUrl, port, wallet, txDb, txMem, txView) {
	this.socket = new io.Socket(serverUrl, {port: port});
	this.socket.connect();
	this.socket.on('connect', $.proxy(this.handleConnect, this));
	this.socket.on('message', $.proxy(this.handleMessage, this));
	this.socket.on('disconnect', $.proxy(this.handleDisconnect, this));

	this.unique = 1;

	this.callbacks = [];

	this.wallet = wallet;
	this.txDb = txDb;
	this.txMem = txMem;
	this.txView = txView;
};

/**
 * Make RPC call.
 */
ExitNode.prototype.call = function (method, argObj, callback) {
	this.socket.send($.toJSON({
		"method": method,
		"params": [argObj],
		"id": this.unique
	}));
	if (callback) this.callbacks[this.unique] = callback;
	this.unique++;
};

ExitNode.prototype.handleConnect = function () {
	var self = this;

	self.call("pubkeysRegister", {
		keys: this.wallet.getAllAddresses().join(',')
	}, function (err, result) {
		if (err) {
			console.error("Could not register public keys");
			return;
		}

		self.call("pubkeysListen", {
			handle: result.handle
		}, function (err, result) {
			// Communicate the block height
			var blockInitEvent = jQuery.Event('blockInit');
			blockInitEvent.height = result.height;
			$(self).trigger(blockInitEvent);

			// Pass on the newly downloaded transactions
			var txDataEvent = jQuery.Event('txData');
			txDataEvent.confirmed = true;
			txDataEvent.txs = result.txs;
			$(self).trigger(txDataEvent);

			// TODO: Download more transactions
		});

		self.call("pubkeysUnconfirmed", {
			handle: result.handle
		}, function (err, result) {
			// Pass on the newly downloaded transactions
			var txDataEvent = jQuery.Event('txData');
			txDataEvent.confirmed = false;
			txDataEvent.txs = result.txs;
			$(self).trigger(txDataEvent);
		});
	});
};


ExitNode.prototype.handleMessage = function (data) {
	console.log(data);
	data = $.parseJSON(data);

	// Handle JSON-RPC result messages
	if ("undefined" !== typeof data.result &&
		"function" == typeof this.callbacks[data.id]) {
		this.callbacks[data.id](data.error, data.result);

	// Handle JSON-RPC request messages
	} else if ("undefined" !== typeof data.method) {
		// Create an event object
		var event = jQuery.Event(data.method);

		// Copy the fields from the parameter object
		$.extend(event, data.params[0]);

		// Send off the event
		$(this).trigger(event);
	}
};


ExitNode.prototype.handleDisconnect = function () {
	// TODO: Attempt reconnect
};
