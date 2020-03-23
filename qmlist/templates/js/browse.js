function layoutCategories() {
    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
    $.get("{{ url_for('browse_stores') }}", {storeName: storeName, category: category})
        .done(function(data) {
            categoryBreadcrumb(data);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

function categoryBreadcrumb(data) {
    $("#browse-categories-breadcrumb").empty();
    $("#browse-categories-dropdown-button").remove();

    $("#browse-categories-breadcrumb").append($("<span>/</span>").addClass("mx-3"));

    for (var index = 0; index < data["current-category"].length - 1; index++) {
        $("#browse-categories-breadcrumb")
            .append($("<span></span>")
                .text(data["current-category"][index])
                .attr("data-category", data["current-category"][index])
                .attr("style", "cursor:pointer; color:blue; text-decoration:underline;")
                .click(function() {
                    $("#browse-items").attr("data-category", $(this).attr("data-category"));
                    layoutCategories();
                    layoutItems(1);
                }))
            .append($("<span>/</span>").addClass("mx-3"));
    }

    var storeCategories = data["store-categories"].map(category => category["name"]);
    var currentCategoryName = data["current-category"][data["current-category"].length - 1];
    $("#browse-categories-breadcrumb")
        .append($("<span></span>").text(currentCategoryName));

    if (!storeCategories.includes(currentCategoryName)) {
        $("#browse-categories-breadcrumb").append($("<span>/</span>").addClass("mx-3"));
    }

    $("#browse-categories-options").empty();
    for (var index in data["store-categories"]) {
        addChildCategory(data["store-categories"][index], 1);
    }
}

function addChildCategory(childCategory) {
    var storeName = $("#browse-items").attr("data-store");

    $("#browse-categories-options").append(
        $("<a></a>")
            .addClass("dropdown-item")
            .attr("href", "#")
            .attr("data-store", storeName)
            .attr("data-category", childCategory["name"])
            .text(childCategory["name"])
            .click(function() {
                var categoryElement = this;
                $("#browse-items").attr("data-category", $(categoryElement).attr("data-category"));
                layoutCategories();
                layoutItems(1);
            }));
}

function itemPriceToString(price) {
    if (price["max"] === price["min"]) {
        return `$${price["max"].toFixed(2)}`;
    } else {
        return `$${price["min"].toFixed(2)} - $${price["max"].toFixed(2)}`;
    }
}

function browseDisplayItemPrice(itemPrice, itemPriceEdited) {
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
                var itemStore = $("#browse-items").attr("data-store");
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
                        var itemStore = $("#browse-items").attr("data-store");
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

function browseDisplayItemName(itemName, itemEdited) {
    var nameArea = $("<div></div>")
        .attr("data-section", "name");

    nameArea
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
                var itemStore = $("#browse-items").attr("data-store");
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
                        var itemStore = $("#browse-items").attr("data-store");
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

function layoutItems(pageno) {
    if (pageno === undefined || pageno === null) {
        pageno = $("#browse-items").attr("data-page");
    }

    var shoppingListName = $("#list-tab").attr("data-list-name");
    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
    var itemCount = $("#item-count-dropdown").attr("data-item-count");
    $.get("{{ url_for('browse_items_page')}}", {"shopping-list": shoppingListName, "store-name": storeName, "category": category, "pageno": pageno, "item-count": itemCount})
        .done(function(data) {
            $("#browse-items").attr("data-page", data["page"]["current"]);

            $("#browse-items").empty();

            for (var index in data["items"]) {
                var item = data["items"][index];
                var itemElement = $("<li></li>")
                    .addClass("list-group-item")
                    .addClass("d-flex")
                    .addClass("justify-content-between")
                    .addClass("align-items-center")
                    .attr("data-name", item["name"])
                    .attr("data-sku", item["sku"])
                    .append(browseDisplayItemName(item["name"], item["edited"]["name"]));

                if ($("#shopping-list").attr("data-editable") === "true") {
                    var quantity = quantityButtons(
                        shoppingListName,
                        item["name"],
                        item["quantity"]);

                    itemElement
                        .attr("data-quantity", item["quantity"])
                        .append($("<div></div>")
                            .append(browseDisplayItemPrice(item["price"], item["edited"]["price"]))
                            .append($("<div></div>")
                                .attr("style", "float: left; width: 10px")
                                .html("&nbsp;"))
                            .append($("<div></div>")
                                .attr("style", "float: left")
                                .attr("data-section", "quantity")
                                .append(quantity)));
                }

                $("#browse-items").append(itemElement);
            }

            itemPagination(data);

            $('[data-toggle="tooltip"]').tooltip();
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

function itemPagination(data) {
    if (data["page"]["next"]) {
        $("#browse-items-next").parents(".page-item").removeClass("disabled");
        $("#browse-items-next").attr("data-page", data["page"]["next"]);
        $("#browse-items-last").parents(".page-item").removeClass("disabled");
        $("#browse-items-last").attr("data-page", data["page"]["last"]);
    } else {
        $("#browse-items-next").parents(".page-item").addClass("disabled");
        $("#browse-items-next").removeAttr("data-page");
        $("#browse-items-last").parents(".page-item").addClass("disabled");
        $("#browse-items-last").removeAttr("data-page");
    }
    if (data["page"]["prev"]) {
        $("#browse-items-prev").parents(".page-item").removeClass("disabled");
        $("#browse-items-prev").attr("data-page", data["page"]["prev"]);
        $("#browse-items-first").parents(".page-item").removeClass("disabled");
        $("#browse-items-first").attr("data-page", 1);
    } else {
        $("#browse-items-prev").parents(".page-item").addClass("disabled");
        $("#browse-items-prev").removeAttr("data-page");
        $("#browse-items-first").parents(".page-item").addClass("disabled");
        $("#browse-items-first").removeAttr("data-page");
    }

    $("#current-page-display").text(data["page"]["current"]);
    $("#last-page-display").text(data["page"]["last"]);
}

$("#nav-tabs").on("show.bs.tab", function(event) {
    var storeName = $(event.target).attr("data-store-name");
    if (storeName !== undefined) {
        var shoppingListName = $("#list-tab").attr("data-list-name");

        $("#browse-tab-content").attr("data-store-name", storeName);
        $("#browse-items").attr("data-store", storeName);
        $("#browse-items").removeAttr("data-category");
        $("#browse-items-prev").parent().addClass("disabled");
        $("#browse-items-first").parent().addClass("disabled");

        layoutCategories(1);
        layoutItems(1);
    }
});

$("#item-count-options").children("a").click(function() {
    $("#item-count-dropdown").attr("data-item-count", $(this).attr("data-item-count"));
    $("#item-count-dropdown-button").text($(this).attr("data-item-count"));
    layoutItems(1);
});

$("#browse-items-last").click(function() {
    if (!$("#browse-items-last").hasClass("disabled")) {
        layoutItems($("#browse-items-last").attr("data-page"));
    }
});

$("#browse-items-next").click(function() {
    if (!$("#browse-items-next").hasClass("disabled")) {
        layoutItems($("#browse-items-next").attr("data-page"));
    }
});

$("#browse-items-prev").click(function() {
    if (!$("#browse-items-prev").hasClass("disabled")) {
        layoutItems($("#browse-items-prev").attr("data-page"));
    }
});

$("#browse-items-first").click(function() {
    if (!$("#browse-items-first").hasClass("disabled")) {
        layoutItems(1);
    }
});