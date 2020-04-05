function _shoppingListEditability(isEditable) {
    $("#list-items").attr("data-editable", isEditable);
}

function setShoppingListEditability(shoppingListName) {
    if (shoppingListName === undefined || shoppingListName === null) {
        _shoppingListEditability(false);
    } else {
        $.get("{{ url_for('load_shopping_list') }}", {"shopping-list": shoppingListName})
            .done(function(data) {
                _shoppingListEditability(data["editable"]);
            })
            .fail(function(jqXHR, textStatus) {
                alert(textStatus);
            });
        }
}

function loadShoppingList(shoppingListName) {
    setListTabEnabled(shoppingListName);
    $.get("{{ url_for('load_shopping_list') }}", {"shopping-list": shoppingListName})
        .done(function(data) {
            _shoppingListEditability(data["editable"]);

            displayItems(data, shoppingListName, true);
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

$("#list-tab").click(function() {
    if (!$("#list-tab").hasClass("disabled")) {
        loadShoppingList($("#list-tab").attr("data-list-name"));
    }
});