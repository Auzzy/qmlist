function loadShoppingList(shoppingListName) {
    $.get("{{ url_for('load_shopping_list') }}", {"shopping-list": shoppingListName})
        .done(function(data) {
            $("#save-list-status").empty();
            $("#save-list").prop("disabled", !data["editable"]);

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

$("#save-list").click(function() {
    $("#save-list-status")
        .removeClass("text-danger")
        .addClass("text-muted")
        .text("Saving...")
    $.post("{{ url_for('shopping_list_save') }}", {"shopping-list": $("#list-tab").attr("data-list-name")})
        .done(function(data) {
            $("#save-list-status").text("Saved at " + new Date().toLocaleTimeString());
            $("#shopping-list .quantity")
                .each(function(index, item) {
                    if ($(item).text() == "0") {
                        $(item).parents(".list-group-item").remove();
                    }
                });
        })
        .fail(function(jqXHR, textStatus) {
            $("#save-list-status")
                .removeClass("text-muted")
                .addClass("text-danger")
                .text("Saving failed");
            alert(textStatus);
        });
});