function loadShoppingListTab(shoppingListName) {
    $("#list-tab").data("list-name", shoppingListName);
    $("#list-tab").text("List - " + shoppingListName);

    loadShoppingList(shoppingListName);

    if ($("#search-tab").hasClass("active")) {
        var searchTerm = $("#search-results").data("search-term");
        if (searchTerm) {
            search(shoppingListName, searchTerm, 1);
        }
    } else if ($("#browse-tab").hasClass("active")) {
        var store = $("#browse-items").data("store");
        var category = $("#browse-items").data("category");
        if (store) {
            layoutItems(shoppingListName, store, category, 1);
        }
    }
}

$("#shopping-list-picker > .dropdown-item").click(function() {
    loadShoppingListTab($(this).data("name"));
});