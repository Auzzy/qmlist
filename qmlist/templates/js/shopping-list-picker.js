function setListTabName(shoppingListName) {
    $("#list-tab").attr("data-list-name", shoppingListName);
    if (shoppingListName === undefined || shoppingListName === null) {
        $("#list-tab").text("List");
    } else {
        $("#list-tab").text("List - " + shoppingListName);
    }
}

function setListTabEnabled(shoppingListName) {
    if (shoppingListName === undefined || shoppingListName === null) {
        $("#list-tab")
            .addClass("disabled")
            .css("cursor", "default");
    } else {
        $("#list-tab")
            .removeClass("disabled")
            .css("cursor", "pointer");
    }
}

function loadShoppingListTab(shoppingListName) {
    setListTabName(shoppingListName);
    setListTabEnabled(shoppingListName);

    if ($("#search-tab").hasClass("active")) {
        setShoppingListEditability(shoppingListName);
        if ($("#search-box").val()) {
            search(1);
        }
    } else if ($("#browse-rd-tab").hasClass("active") || $("#browse-bjs-tab").hasClass("active")) {
        setShoppingListEditability(shoppingListName);
        browseItems(1);
    } else if ($("#list-tab").hasClass("active")) {
        loadShoppingList(shoppingListName);
    }
}

$("#load-list-dropdown").on("show.bs.dropdown", function() {
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            $("#shopping-list-picker").empty();
            data["lists"].sort((first, second) => first["departure"] - second["departure"]);
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