function setListTabName(shoppingListName) {
    $("#list-tab").attr("data-list-name", shoppingListName);
    if (shoppingListName === undefined || shoppingListName === null) {
        $("#list-tab").text("List");
    } else {
        $("#list-tab").text("List - " + shoppingListName);
    }
}

function loadShoppingListTab(shoppingListName) {
    setListTabName(shoppingListName);

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

$("#load-list-dropdown").on("show.bs.dropdown", function() {
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            $("#shopping-list-picker").empty();
            data["lists"].forEach(list_info => {
                $("#shopping-list-picker")
                    .append($("<a></a>")
                        .addClass("dropdown-item")
                        .attr("data-name", list_info["name"])
                        .attr("href", "#")
                        .text(list_info["name"])
                        .click(function() {
                            loadShoppingListTab($(this).attr("data-name"));
                        }));
            });
        });
});