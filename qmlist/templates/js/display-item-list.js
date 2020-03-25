function _itemListId(subId) {
    var parentId = $("#nav-tabs-content .active").attr("id");
    return `#${parentId}-${subId}`;
}
function _itemListElement(subId) {
    return $(_itemListId(subId));
}


function itemPriceToString(price) {
    if (price["max"] === price["min"]) {
        return `$${price["max"].toFixed(2)}`;
    } else {
        return `$${price["min"].toFixed(2)} - $${price["max"].toFixed(2)}`;
    }
}

function displayItemPrice(itemPrice, itemPriceEdited) {
    var priceArea = $("<span></span>")
        .attr("data-section", "price");

    var priceStr = itemPriceToString(itemPrice);

    // {# Only add all the machinery for editing if the user is actually allowed to edit. #}
    // {% if is_admin %}
    priceArea
        .append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-right": "5px", "float": "left"})
            .attr("data-sub-section", "edit-button")
            .css("float", "left")
            .click(function() {
                var root = $(this).parents("[data-section='price']");
                root.children("form").css("display", "inline-block");
                root.children("[data-sub-section='display']").css("display", "none");
                root.children("[data-sub-section='edit-button']").css("display", "none");
                root.children("[data-sub-section='reset-button']").css("display", "none");

                $(this).parents("li").find("[data-section='quantity']").css("display", "none");

                root.find("form input[name='priceMin']").val(root.find("[data-sub-section='display']").attr("data-price-min"));
                root.find("form input[name='priceMax']").val(root.find("[data-sub-section='display']").attr("data-price-max"));
            }))
        .append(faButton("fa", "fa-history", {"color": "deepskyblue", "margin-right": "5px", "float": "left"})
            .attr("data-sub-section", "reset-button")
            .css("float", "left")
            .click(function() {
                var root = $(this).parents("[data-section='price']");
                var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
                var itemStore = $(this).parents("li[data-store]").attr("data-store");
                $.post("{{ url_for('reset_item_price') }}", {sku: itemSku, store: itemStore})
                    .done(data => {
                        root.children("[data-sub-section='display']")
                            .attr("data-price-min", data["price"]["min"])
                            .attr("data-price-max", data["price"]["max"])
                            .attr("data-edited", "false")
                            .text(itemPriceToString(data["price"]));

                        root.find("[data-sub-section='reset-button']").css("display", "none");
                    });
            }));

    priceArea.children("[data-sub-section='display']").attr("data-edited", itemPriceEdited.toString());
    if (!itemPriceEdited) {
        priceArea.children("[data-sub-section='reset-button']").css("display", "none");
    };
    // {% endif %}

    priceArea
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-price-min", itemPrice["min"])
            .attr("data-price-max", itemPrice["max"])
            .css("float", "left")
            .css("font-style", "italic")
            .text(priceStr));

    // {# Only add all the machinery for editing if the user is actually allowed to edit. #}
    // {% if is_admin %}
    priceArea
        .append($("<form></form>")
            .css("display", "none")
            .addClass("needs-validation")
            .addClass("form-inline")
            .css("margin-bottom", "0px")
            .attr("action", "")
            .attr("novalidate", "")
            .append(faButton("fa", "fa-check-square", {"size": "lg", "color": "limegreen", "margin-right": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='price']");
                    var form = root.children("form");
                    if (form.get(0).checkValidity() === false) {
                        event.preventDefault();
                        event.stopPropagation();
                        form.addClass("was-validated");
                    } else {
                        root.find("form input").removeClass("is-invalid");

                        var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
                        var itemStore = $(this).parents("li[data-store]").attr("data-store");
                        $.post("{{ url_for('update_item_price') }}", {sku: itemSku, store: itemStore, price_min: form.children("input[name='priceMin']").val(), price_max: form.children("input[name='priceMax']").val()})
                            .done(data => {
                                root.children("form").css("display", "none");
                                root.children("[data-sub-section='display']")
                                    .css("display", "block")
                                    .attr("data-price-min", data["price"]["min"])
                                    .attr("data-price-max", data["price"]["max"])
                                    .attr("data-edited", data["edited"].toString())
                                    .text(itemPriceToString(data["price"]));
                                root.children("[data-sub-section='edit-button']").css("display", "inline-block");

                                $(this).parents("li").find("[data-section='quantity']").css("display", "inline-block");
                                root.find("[data-sub-section='reset-button']").css("display", data["edited"] ? "inline-block" : "none");
                            })
                            .fail(data => {
                                var errors = data["responseJSON"]["errors"];
                                for (index in errors) {
                                    if (errors[index]["field"] === "min") {
                                        form.children("input[name='priceMin']").addClass("is-invalid");
                                    }
                                    if (errors[index]["field"] === "max") {
                                        form.children("input[name='priceMax']").addClass("is-invalid");
                                    }
                                }
                            });
                    }
                }))
            .append(faButton("fa", "fa-window-close", {"size": "lg", "color": "red", "margin-right": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='price']");
                    root.children("form").css("display", "none");
                    root.children("[data-sub-section='display']").css("display", "block");
                    root.children("[data-sub-section='edit-button']").css("display", "inline-block");

                    $(this).parents("li").find("[data-section='quantity']").css("display", "inline-block");

                    root.find("form").children("input[name='priceMin']")
                        .removeClass("is-invalid")
                        .val(root.children("[data-sub-section='display']").attr("data-price-min"));
                    root.find("form").children("input[name='priceMax']")
                        .removeClass("is-invalid")
                        .val(root.children("[data-sub-section='display']").attr("data-price-max"));
                    
                    if (root.children("[data-sub-section='display']").attr("data-edited") == "true") {
                        root.children("[data-sub-section='reset-button']").css("display", "inline-block");
                    }
                }))
            .append($("<input></input>")
                .addClass("form-control")
                .css("float", "left")
                .attr("name", "priceMin")
                .attr("type", "text")
                // It seems Bootstrap doesn't strickly follow the size attribute. This makes it as small as possible, which is still plenty big.
                .attr("size", "1")
                .attr("required", "")
                .val(itemPrice["min"]))
            .append($("<input></input>")
                .addClass("form-control")
                .css("float", "left")
                .attr("name", "priceMax")
                .attr("type", "text")
                // It seems Bootstrap doesn't strickly follow the size attribute. This makes it as small as possible, which is still plenty big.
                .attr("size", "1")
                .attr("required", "")
                .val(itemPrice["max"])));
    // {% endif %}

    return priceArea;
}

function displayItemName(itemName, itemEdited, itemStore) {
    var nameArea = $("<div></div>")
        .attr("data-section", "name");

    nameArea
        .append($("<div></div>")
            .attr("data-sub-section", "store")
            .attr("data-store", itemStore)
            .css("float", "left")
            .css("margin-right", "5px")
            .addClass("badge")
            .addClass(itemStore === "BJs" ? "badge-danger" : "badge-primary")
            .text(itemStore))
        .append($("<div></div>")
            .attr("data-sub-section", "display")
            .attr("data-item", itemName)
            .css("float", "left")
            .text(itemName));

    // {# Only add all the machinery for editing if the user is actually allowed to edit. #}
    // {% if is_admin %}
    nameArea
        .append(faButton("fa", "fa-edit", {"color": "darkorange", "margin-left": "5px", "float": "left"})
            .attr("data-sub-section", "edit-button")
            .click(function() {
                var root = $(this).parents("[data-section='name']");
                root.children("form").css("display", "inline-block");
                root.children("[data-sub-section='display']").css("display", "none");
                root.children("[data-sub-section='edit-button']").css("display", "none");
                root.children("[data-sub-section='reset-button']").css("display", "none");

                root.find("form input").val(root.find("[data-sub-section='display']").attr("data-item"));
            }))
        .append(faButton("fa", "fa-history", {"color": "deepskyblue", "margin-left": "5px", "float": "left"})
            .attr("data-sub-section", "reset-button")
            .click(function() {
                var root = $(this).parents("[data-section='name']");
                var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
                var itemStore = $(this).parents("li[data-store]").attr("data-store");
                $.post("{{ url_for('reset_item_name') }}", {sku: itemSku, store: itemStore})
                    .done(data => {
                        root.children("[data-sub-section='display']")
                            .attr("data-item", data["name"])
                            .attr("data-edited", "false")
                            .text(data["name"]);
                        $(this).parents("li[data-name]").attr("data-name", data["name"]);

                        root.find("[data-sub-section='reset-button']").css("display", "none");
                    });
            }));

    nameArea.children("[data-sub-section='display']").attr("data-edited", itemEdited.toString());
    if (!itemEdited) {
        nameArea.children("[data-sub-section='reset-button']").css("display", "none");
    }

    nameArea
        .append($("<form></form>")
            .css("display", "none")
            .addClass("needs-validation")
            .addClass("form-inline")
            .css("margin-bottom", "0px")
            .attr("action", "")
            .attr("novalidate", "")
            .append($("<input></input>")
                .addClass("form-control")
                .css("float", "left")
                .attr("type", "text")
                .attr("required", "")
                .val(itemName))
            .append(faButton("fa", "fa-check-square", {"size": "lg", "color": "limegreen", "margin-left": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='name']");
                    var form = root.children("form");
                    if (form.get(0).checkValidity() === false) {
                        event.preventDefault();
                        event.stopPropagation();
                        form.addClass("was-validated");
                    } else {
                        var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
                        var itemStore = $(this).parents("li[data-store]").attr("data-store");
                        $.post("{{ url_for('update_item_name') }}", {sku: itemSku, store: itemStore, name: form.children("input").val()})
                            .done(data => {
                                root.children("form").css("display", "none");
                                root.children("[data-sub-section='display']")
                                    .css("display", "block")
                                    .attr("data-item", data["name"])
                                    .attr("data-edited", data["edited"].toString())
                                    .text(data["name"]);
                                root.children("[data-sub-section='edit-button']").css("display", "inline-block");
                                $(this).parents("li[data-name]").attr("data-name", data["name"]);

                                root.find("[data-sub-section='reset-button']").css("display", data["edited"] ? "inline-block" : "none");
                            })
                            .fail(data => {
                                var error = data["responseJSON"]["error"];
                                if (error["field"] === "name") {
                                    form.children("input").addClass("is-invalid");
                                }
                            });
                    }
                }))
            .append(faButton("fa", "fa-window-close", {"size": "lg", "color": "red", "margin-left": "5px", "float": "left"})
                .click(function() {
                    var root = $(this).parents("[data-section='name']");
                    root.children("form")
                        .css("display", "none")
                        .removeClass("was-validated");
                    root.children("[data-sub-section='display']").css("display", "block");
                    root.children("[data-sub-section='edit-button']").css("display", "inline-block");
                    if (root.children("[data-sub-section='display']").attr("data-edited") == "true") {
                        root.children("[data-sub-section='reset-button']").css("display", "inline-block");
                    }

                    root.find("form").children("input")
                        .removeClass("is-invalid")
                        .val(root.children("[data-sub-section='display']").attr("data-item"));
                })));
    // {% endif %}

    return nameArea;
}

function displayItems(data, shoppingListName, showStore) {
    showStore = showStore === undefined ? true : showStore;

    _itemListElement("items").empty();

    for (var index in data["items"]) {
        var item = data["items"][index];
        var itemElement = $("<li></li>")
            .addClass("list-group-item")
            .addClass("d-flex")
            .addClass("justify-content-between")
            .addClass("align-items-center")
            .attr("data-name", item["name"])
            .attr("data-sku", item["sku"])
            .attr("data-store", item["store"])
            .append(displayItemName(item["name"], item["edited"]["name"], item["store"]));

        var rightColumn = $("<div></div>")
            .append(displayItemPrice(item["price"], item["edited"]["price"]));
        if ($("#shopping-list").attr("data-editable") === "true") {
            rightColumn
                .append($("<div></div>")
                    .css("float", "left")
                    .css("margin-left", "10px")
                    .attr("data-section", "quantity")
                    .append(quantityButtons(shoppingListName, item["name"], item["quantity"])));
        }

        _itemListElement("items").append(itemElement.append(rightColumn));
    }

    if (!showStore) {
        _itemListElement("items [data-sub-section='store']").css("display", "none");
    }

    itemPagination(data);

    $('[data-toggle="tooltip"]').tooltip();
}

function itemPagination(data) {
    if (data["page"]["next"]) {
        _itemListElement("items-next").parents(".page-item").removeClass("disabled");
        _itemListElement("items-next").attr("data-page", data["page"]["next"]);
        _itemListElement("items-last").parents(".page-item").removeClass("disabled");
        _itemListElement("items-last").attr("data-page", data["page"]["last"]);
    } else {
        _itemListElement("items-next").parents(".page-item").addClass("disabled");
        _itemListElement("items-next").removeAttr("data-page");
        _itemListElement("items-last").parents(".page-item").addClass("disabled");
        _itemListElement("items-last").removeAttr("data-page");
    }
    if (data["page"]["prev"]) {
        _itemListElement("items-prev").parents(".page-item").removeClass("disabled");
        _itemListElement("items-prev").attr("data-page", data["page"]["prev"]);
        _itemListElement("items-first").parents(".page-item").removeClass("disabled");
        _itemListElement("items-first").attr("data-page", 1);
    } else {
        _itemListElement("items-prev").parents(".page-item").addClass("disabled");
        _itemListElement("items-prev").removeAttr("data-page");
        _itemListElement("items-first").parents(".page-item").addClass("disabled");
        _itemListElement("items-first").removeAttr("data-page");
    }

    _itemListElement("items-current-page-display").text(data["page"]["current"]);
    _itemListElement("items-last-page-display").text(data["page"]["last"]);
}

function resetItemPagination() {
    itemPagination({"page": {"current": "", "last": ""}});
}

function attachItemPaginationListeners(callback) {
    _itemListElement("item-count-options").children("a").off("click").click(function() {
        _itemListElement("item-count-dropdown").attr("data-item-count", $(this).attr("data-item-count"));
        _itemListElement("item-count-dropdown-button").text($(this).attr("data-item-count"));
        callback(1);
    });

    _itemListElement("items-last").off("click").click(function() {
        if (!_itemListElement("items-last").hasClass("disabled")) {
            callback(_itemListElement("items-last").attr("data-page"));
        }
    });

    _itemListElement("items-next").off("click").click(function() {
        if (!_itemListElement("items-next").hasClass("disabled")) {
            callback(_itemListElement("items-next").attr("data-page"));
        }
    });

    _itemListElement("items-prev").off("click").click(function() {
        if (!_itemListElement("items-prev").hasClass("disabled")) {
            callback(_itemListElement("items-prev").attr("data-page"));
        }
    });

    _itemListElement("items-first").off("click").click(function() {
        if (!_itemListElement("items-first").hasClass("disabled")) {
            callback(1);
        }
    });
}