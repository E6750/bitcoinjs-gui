var Message = function (msg, type) {
	if (type == "error") type = "errormsg";

	this.el = $('<div><p></p></div>')
		.addClass('message')
		.addClass(type);
	this.el.find('p').text(msg);
	this.closeButton = $('<span class="close" title="Dismiss"></span>')
		.appendTo(this.el)
		.click(function () {
			$(this).parent().fadeOut('fast', function() { $(this).remove(); });
		})
	;
};

Message.create = function (msg, type) {
	var msg = new Message(msg, type);

	return msg.el.hide().fadeIn('slow');
};
