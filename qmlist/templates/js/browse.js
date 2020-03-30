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
                    browseItems(1);
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
                browseItems(1);
            }));
}

function browseItems(pageno) {
    var shoppingListName = $("#list-tab").attr("data-list-name");
    var storeName = $("#browse-items").attr("data-store");
    var category = $("#browse-items").attr("data-category");
    var itemCount = $("#browse-item-count-dropdown").attr("data-item-count");
    $.get("{{ url_for('browse_items_page')}}", {"shopping-list": shoppingListName, "store-name": storeName, "category": category, "pageno": pageno, "item-count": itemCount})
        .done(function(data) {
            displayItems(data, shoppingListName, false);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

$("#nav-tabs").on("show.bs.tab", function(event) {
    if (["browse-bjs-tab", "browse-rd-tab"].includes($(event.target).attr("id"))) {
        var storeName = $(event.target).attr("data-store-name");
        if (storeName !== undefined) {
            var shoppingListName = $("#list-tab").attr("data-list-name");

            $("#browse-tab-content").attr("data-store-name", storeName);
            $("#browse-items").attr("data-store", storeName);
            $("#browse-items").removeAttr("data-category");
            $("#browse-items-prev").parent().addClass("disabled");
            $("#browse-items-first").parent().addClass("disabled");

            setShoppingListEditability(shoppingListName);
            layoutCategories(1);
            browseItems(1);
            resetItemPagination();
        }
    }
});

$("#nav-tabs").on("shown.bs.tab", function(event) {
    if (["browse-bjs-tab", "browse-rd-tab"].includes($(event.target).attr("id"))) {
        attachItemPaginationListeners(browseItems);
    }
});