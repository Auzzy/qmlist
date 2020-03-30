function faButton(iconStyle, iconName, kwargs) {
    kwargs = kwargs === undefined ? {} : kwargs;
    var icon = $("<i></i>")
        .addClass(iconStyle)
        .addClass(iconName);

    if (kwargs["size"] !== undefined) {
        icon.addClass(`fa-${kwargs["size"]}`);
    }
    if (kwargs["color"] !== undefined) {
        icon.css("color", kwargs["color"]);
    }

    if (kwargs["margin-left"] !== undefined) {
        icon.css("margin-left", kwargs["margin-left"]);
    }

    if (kwargs["margin-right"] !== undefined) {
        icon.css("margin-right", kwargs["margin-right"]);
    }

    if (kwargs["float"] !== undefined) {
        icon.css("float", kwargs["float"]);
    }

   return $("<span></span>")
        .css("cursor", "pointer")
        .append(icon);
}