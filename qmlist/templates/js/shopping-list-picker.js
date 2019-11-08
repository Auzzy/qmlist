function loadShoppingListTab(shoppingListName) {
    $("#list-tab").attr("data-list-name", shoppingListName);
    $("#list-tab").text("List - " + shoppingListName);

    loadShoppingList(shoppingListName);

    if ($("#search-tab").hasClass("active")) {
        var searchTerm = $("#search-results").attr("data-search-term");
        if (searchTerm) {
            search(shoppingListName, searchTerm, 1);
        }
    } else if ($("#browse-rd-tab").hasClass("active") || $("#browse-bjs-tab").hasClass("active")) {
        layoutItems();
    }
}

$("#shopping-list-picker > .dropdown-item").click(function() {
    loadShoppingListTab($(this).attr("data-name"));
});