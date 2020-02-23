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
        return `$${price["max"]}`;
    } else {
        return `$${price["min"]} - $${price["max"]}`;
    }
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
            $("#browse-items").attr("data-store", data["store"]);
            $("#browse-items").attr("data-category", data["category"]);
            $("#browse-items").attr("data-page", data["page"]["current"]);

            $("#browse-items").empty();

            for (var index in data["store-items"]) {
                var item = data["store-items"][index];
                var itemElement = $("<li></li>")
                    .addClass("list-group-item")
                    .addClass("d-flex")
                    .addClass("justify-content-between")
                    .addClass("align-items-center")
                    .attr("data-name", item["name"])
                    .append($("<div></div>")
                        .addClass("text-truncate")
                        .attr("style", "max-width: 93%")
                        .text(item["name"]));

                if ($("#shopping-list").attr("data-editable") === "true") {
                    var quantity = quantityButtons(
                        shoppingListName,
                        item["name"],
                        item["quantity"]);

                    itemElement
                        .attr("data-quantity", item["quantity"])
                        .append($("<div></div>")
                            .append($("<div></div>")
                                .attr("style", "font-style: italic; float: left")
                                .text(itemPriceToString(item["price"])))
                            .append($("<div></div>")
                                .attr("style", "float: left; width: 10px")
                                .html("&nbsp;"))
                            .append($("<div></div>")
                                .attr("style", "float: left")
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