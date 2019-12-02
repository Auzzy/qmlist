function layoutCategories(pageno) {
    if (pageno === undefined || pageno === null) {
        pageno = $("#browse-items").attr("data-page");
    }

    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
    $.get("{{ url_for('browse_stores') }}", {storeName: storeName, category: category, page: pageno})
        .done(function(data) {
            $("#browse-categpries").attr("data-page", data["page"]["current"]);
            $("#browse-categories-content").empty();
            $("#browse-categories-pagination").empty();
            $("#browse-categories-breadcrumb").empty();

            for (var index in data["store-categories"]) {
                addChildCategory(data["store-categories"][index], pageno);
            }

            categoryPagination(data);
            categoryBreadcrumb(data);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

function addChildCategory(childCategory, pageno) {
    var storeName = $("#browse-items").attr("data-store");
    var card = $("<div></div>")
        .addClass("card")
        .append($("<a></a>")
            .addClass("card-body")
            .attr("style", "text-decoration: inherit; color: inherit;")
            .attr("href", "#")
            .attr("data-store", storeName)
            .attr("data-category", childCategory["name"])
            .attr("data-has-children", childCategory["hasChildren"])
            .text(childCategory["name"])
            .click(function() {
                var categoryElement = this;
                $("#browse-items").attr("data-category", $(categoryElement).attr("data-category"));
                if ($(categoryElement).attr("data-has-children")) {
                    layoutCategories(pageno);
                }
                layoutItems(1);
            }));
    var currentCategory = $("#browse-items").attr("data-category");
    if (currentCategory == childCategory["name"]) {
        card.addClass("border-info").addClass("text-info");
    }

    $("#browse-categories-content")
        .append($("<div></div>")
            .addClass("col-3")
            .append(card));
}

function categoryPagination(data) {
    if (data["page"]["next"]) {
        $("#browse-category-next").removeClass("arrow-disabled");
        $("#browse-category-next").attr("data-page", data["page"]["next"]);
    } else {
        $("#browse-category-next").addClass("arrow-disabled");
        $("#browse-category-next").removeAttr("data-page");
    }
    if (data["page"]["prev"]) {
        $("#browse-category-prev").removeClass("arrow-disabled");
        $("#browse-category-prev").attr("data-page", data["page"]["prev"]);
    } else {
        $("#browse-category-prev").addClass("arrow-disabled");
        $("#browse-category-prev").removeAttr("data-page");
    }
}

function categoryBreadcrumb(data) {
    $("#browse-categories-breadcrumb")
        .append($("<span>/</span>").addClass("mx-3"))
        .append($("<span></span>")
            .text("All")
            .attr("style", "cursor:pointer; color:blue; text-decoration:underline;")
            .click(function() {
                $("#browse-items").removeAttr("data-category");
                layoutCategories(1);
                layoutItems(1);
            }));

    for (var index in data["current-category"]) {
        if (index == data["current-category"].length - 1) {
            break;
        }

        $("#browse-categories-breadcrumb")
            .append($("<span>/</span>").addClass("mx-3"))
            .append($("<span></span>")
                .text(data["current-category"][index])
                .attr("data-category", data["current-category"][index])
                .attr("style", "cursor:pointer; color:blue; text-decoration:underline;")
                .click(function() {
                    $("#browse-items").attr("data-category", $(this).attr("data-category"));
                    layoutCategories(1);
                    layoutItems(1);
                }));
    }
    $("#browse-categories-breadcrumb")
        .append($("<span>/</span>").addClass("mx-3"))
        .append($("<span></span>")
                .text(data["current-category"][data["current-category"].length - 1]));
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
                var itemElement = $("<li></li>")
                    .addClass("list-group-item")
                    .addClass("d-flex")
                    .addClass("justify-content-between")
                    .addClass("align-items-center")
                    .attr("data-name", data["store-items"][index]["name"])
                    .append($("<div></div>")
                        .addClass("text-truncate")
                        .attr("style", "max-width: 93%")
                        .attr("data-toggle", "tooltip")
                        .attr("title", data["store-items"][index]["name"])
                        .text(data["store-items"][index]["name"]));;

                if ($("#shopping-list").attr("data-editable") === "true") {
                    var quantity = quantityButtons(
                        shoppingListName,
                        data["store-items"][index]["name"],
                        data["store-items"][index]["quantity"]);

                    itemElement
                        .attr("data-quantity", data["store-items"][index]["quantity"])
                        .append(quantity);
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
        $("#browse-items-next").parent().removeClass("disabled");
        $("#browse-items-next").attr("data-page", data["page"]["next"]);
        $("#browse-items-last").parent().removeClass("disabled");
        $("#browse-items-last").attr("data-page", data["page"]["last"]);
    } else {
        $("#browse-items-next").parent().addClass("disabled");
        $("#browse-items-next").removeAttr("data-page");
        $("#browse-items-last").parent().addClass("disabled");
        $("#browse-items-last").removeAttr("data-page");
    }
    if (data["page"]["prev"]) {
        $("#browse-items-prev").parent().removeClass("disabled");
        $("#browse-items-prev").attr("data-page", data["page"]["prev"]);
        $("#browse-items-first").parent().removeClass("disabled");
        $("#browse-items-first").attr("data-page", 1);
    } else {
        $("#browse-items-prev").parent().addClass("disabled");
        $("#browse-items-prev").removeAttr("data-page");
        $("#browse-items-first").parent().addClass("disabled");
        $("#browse-items-first").removeAttr("data-page");
    }

    $("#browse-items-pagination-pages").find(".page-link[id!=browse-items-prev][id!=browse-items-next][id!=browse-items-first][id!=browse-items-last]").parent().empty();
    var currentPage = data["page"]["current"];
    var paginationWidth = 6;
    var startPage = Math.max(1, currentPage - Math.floor(paginationWidth / 2));
    var endPage = Math.min(data["page"]["last"], startPage + paginationWidth);
    startPage -= paginationWidth - (endPage - startPage);
    for (var pageno = startPage; pageno < endPage + 1; pageno++) {
        var paginationEntry = $("<li></li>")
            .addClass("page-item")
            .append($("<a></a>")
                .addClass("page-link")
                .attr("href", "#")
                .attr("data-page", pageno)
                .text(pageno)
                .click(function() {
                    layoutItems($(this).attr("data-page"));
                }));

        if (pageno == currentPage) {
            paginationEntry.addClass("active");
        }

        paginationEntry.insertBefore($("#browse-items-next").parent());
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

$("#browse-category-next").click(function() {
    if (!$("#browse-category-next").hasClass("arrow-disabled")) {
        layoutCategories($("#browse-category-next").attr("data-page"));
    }
});

$("#browse-category-prev").click(function() {
    if (!$("#browse-category-prev").hasClass("arrow-disabled")) {
        layoutCategories($("#browse-category-prev").attr("data-page"));
    }
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