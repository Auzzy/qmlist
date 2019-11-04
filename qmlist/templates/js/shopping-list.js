function loadShoppingList(shoppingListName) {
    $.get("{{ url_for('load_shopping_list') }}", {"shopping-list": shoppingListName})
        .done(function(data) {
            $("#save-list-status").empty();
            $("#save-list").prop("disabled", !data["editable"]);
            $("#shopping-list").attr("data-editable", data["editable"]);

            $("#shopping-list").empty();
            data["shopping-list"]
                .sort(function(item1, item2) {return item1["name"].toLowerCase() > item2["name"].toLowerCase()})
                .forEach(function(item, index) {
                    var listItem = $("<li></li>")
                        .addClass("list-group-item")
                        .addClass("d-flex")
                        .addClass("justify-content-between")
                        .addClass("align-items-center")
                        .attr("data-name", item["name"])
                        .attr("data-quantity", item["quantity"])
                        .append($("<div></div>")
                            .addClass("text-truncate")
                            .attr("style", "max-width: 93%")
                            .attr("data-toggle", "tooltip")
                            .attr("title", item["name"])
                            .text(item["name"]));

                    if (data["editable"]) {
                        listItem.append(quantityButtons(shoppingListName, item["name"], item["quantity"]));
                    } else {
                        listItem.append(quantitySection(item["name"], item["quantity"]));
                    }

                    $("#shopping-list").append(listItem);
                });
        })
        .fail(function(jqXHR, textStatus) {
            alert(textStatus);
        });
}

$("#list-tab").click(function() {
     loadShoppingList($("#list-tab").attr("data-list-name"));
});