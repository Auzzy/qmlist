function layoutCategories(shoppingListName, storeName, category, pageNum) {
    $.get("{{ url_for('browse_stores') }}", {storeName: storeName, category: category, page: pageNum})
        .done(function(data) {
            $("#browse-categories").empty();
            $("#browse-categories-pagination").empty();
            $("#browse-categories-breadcrumb").empty();

            for (var index in data["store-categories"]) {
                addChildCategory(shoppingListName, storeName, category, data["store-categories"][index], pageNum);
            }

            categoryPagingation(shoppingListName, storeName, category, data);
            categoryBreadcrumb(shoppingListName, storeName, data);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

function addChildCategory(shoppingListName, storeName, currentCategory, childCategory, pageNum) {
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
                var category = $(categoryElement).attr("data-category");
                if ($(categoryElement).attr("data-has-children")) {
                    layoutCategories(shoppingListName, storeName, category, pageNum);
                }
                layoutItems(shoppingListName, storeName, category);
            }));
    if (currentCategory == childCategory["name"]) {
        card.addClass("border-info").addClass("text-info");
    }

    $("#browse-categories")
        .append($("<div></div>")
            .addClass("col-3")
            .addClass("mt-3")
            .append(card));
}

function categoryPagingation(shoppingListName, storeName, category, data) {
    $("#browse-categories-pagination")
        .append($("<div></div>")
            .addClass("col-1")
            .append($("<button></button>")
                .addClass("btn")
                .addClass("btn-outline-primary")
                .attr("id", "browse-category-prev")
                .text("Prev")))
        .append($("<div></div>")
            .addClass("col-1")
            .append($("<button></button>")
                .addClass("btn")
                .addClass("btn-outline-primary")
                .attr("id", "browse-category-next")
                .text("Next")));

    if (data["page"]["next"]) {
        $("#browse-category-next").click(function() {
            layoutCategories(shoppingListName, storeName, category, data["page"]["next"]);
        });
    } else {
        $("#browse-category-next").attr("disabled", "disabled");
    }
    if (data["page"]["prev"]) {
        $("#browse-category-prev").click(function() {
            layoutCategories(shoppingListName, storeName, category, data["page"]["prev"]);
        });
    } else {
        $("#browse-category-prev").attr("disabled", "disabled");
    }
}

function categoryBreadcrumb(shoppingListName, storeName, data) {
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
                    var category = $(this).attr("data-category");
                    layoutCategories(shoppingListName, storeName, category, 1);
                    layoutItems(shoppingListName, storeName, category, 1);
                }));
    }
    $("#browse-categories-breadcrumb")
        .append($("<span>/</span>").addClass("mx-3"))
        .append($("<span></span>")
                .text(data["current-category"][data["current-category"].length - 1]));
}

function layoutItems(shoppingListName, storeName, category, pageno) {
    if (pageno === undefined || pageno === null) {
        pageno = 1;
    }

    if (pageno == 1) {
        $("#browse-items").empty();
    }

    $.get("{{ url_for('browse_items_page')}}", {"shopping-list": shoppingListName, "store-name": storeName, "category": category, "pageno": pageno})
        .done(function(data) {
            $("#browse-items").attr("data-store", data["store"]);
            $("#browse-items").attr("data-category", data["category"]);
            $("#browse-items").attr("data-next-page", pageno + 1);

            for (var index in data["store-items"]) {
                var quantity = quantityButtons(
                    shoppingListName,
                    data["store-items"][index]["name"],
                    data["store-items"][index]["quantity"]);

                $("#browse-items")
                    .append($("<li></li>")
                        .addClass("list-group-item")
                        .addClass("d-flex")
                        .addClass("justify-content-between")
                        .addClass("align-items-center")
                        .attr("data-name", data["store-items"][index]["name"])
                        .attr("data-quantity", data["store-items"][index]["quantity"])
                        .append($("<div></div>")
                            .addClass("text-truncate")
                            .attr("style", "max-width: 93%")
                            .attr("data-toggle", "tooltip")
                            .attr("title", data["store-items"][index]["name"])
                            .text(data["store-items"][index]["name"]))
                        .append(quantity));
            }
            
            $('[data-toggle="tooltip"]').tooltip();
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

$("#browse-stores .nav-link").click(function() {
    var storeElement = this;
    var shoppingListName = $("#list-tab").attr("data-list-name");

    $("#browse-stores .nav-link").removeClass("active");
    $(storeElement).addClass("active");
    layoutCategories(shoppingListName, $(storeElement).attr("data-name"), null, 1);
    layoutItems(shoppingListName, $(storeElement).attr("data-name"), null, 1);
});

$('#browse-items').on('scroll', function detectBottom() {
    var shoppingListName = $("#list-tab").attr("data-list-name");
    
    if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 1000) {
        $('#browse-items').off('scroll');

        layoutItems(
            shoppingListName,
            $("#browse-items").attr("data-store"),
            $("#browse-items").attr("data-category"),
            parseInt($("#browse-items").attr("data-next-page")));

        setTimeout(function () {
            $('#browse-items').on('scroll', detectBottom);
        }, 250);
    }
})