function layoutCategories(pageNum) {
    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
    $.get("{{ url_for('browse_stores') }}", {storeName: storeName, category: category, page: pageNum})
        .done(function(data) {
            $("#browse-categories").empty();
            $("#browse-categories-pagination").empty();
            $("#browse-categories-breadcrumb").empty();

            for (var index in data["store-categories"]) {
                addChildCategory(data["store-categories"][index], pageNum);
            }

            categoryPagingation(data);
            categoryBreadcrumb(data);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

function addChildCategory(childCategory, pageNum) {
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
                    layoutCategories(pageNum);
                }
                layoutItems(1);
            }));
    var currentCategory = $("#browse-items").attr("data-category");
    if (currentCategory == childCategory["name"]) {
        card.addClass("border-info").addClass("text-info");
    }

    $("#browse-categories")
        .append($("<div></div>")
            .addClass("col-3")
            .addClass("mt-3")
            .append(card));
}

function categoryPagingation(data) {
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

function categoryBreadcrumb(data) {
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
        pageno = 1;
    }

    if (pageno == 1) {
        $("#browse-items").empty();
    }

    var shoppingListName = $("#list-tab").attr("data-list-name");
    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
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

$("#nav-tabs").on("show.bs.tab", function(event) {
    var storeName = $(event.target).attr("data-store-name");
    if (storeName !== undefined) {
        var shoppingListName = $("#list-tab").attr("data-list-name");
    
        $("#browse-tab-content").attr("data-store-name", storeName);
        $("#browse-items").attr("data-store", storeName);
        $("#browse-items").removeAttr("data-category");
        $("#browse-items").attr("data-next-page", 1);

        layoutCategories(1);
        layoutItems(1);
    }
});


$('#browse-items').on('scroll', function detectBottom() {
    var shoppingListName = $("#list-tab").attr("data-list-name");
    
    if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 1000) {
        $('#browse-items').off('scroll');

        layoutItems(parseInt($("#browse-items").attr("data-next-page")));

        setTimeout(function () {
            $('#browse-items').on('scroll', detectBottom);
        }, 250);
    }
});