function loadShoppingList(shoppingListName) {
    if (shoppingListName === undefined || shoppingListName === null) {
        $("#list-tab").addClass("disabled");
    } else {
        $("#list-tab").removeClass("disabled");

        $.get("{{ url_for('load_shopping_list') }}", {"shopping-list": shoppingListName})
            .done(function(data) {
                $("#list-items").attr("data-editable", data["editable"]);

                displayItems(data, shoppingListName, true);
            })
            .fail(function(jqXHR, textStatus) {
                alert(textStatus);
            });
    }
}

$("#list-tab").click(function() {
     loadShoppingList($("#list-tab").attr("data-list-name"));
});