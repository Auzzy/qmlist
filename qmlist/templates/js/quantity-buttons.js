function toggleDecr(decrBtn, disable) {
    if (disable) {
        decrBtn.attr("disabled", "");
    } else {
        decrBtn.removeAttr("disabled");
    }
}

function decrButton(shoppingListName, itemName, itemQuantity) {
    var decrBtn = faButton("fa", "fa-minus-square", {"color": "red", "size": "lg"})
        .addClass("decr-btn")
        .click(function() {
            var decrBtn = $(this);
            var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
            var itemStore = $(this).parents("li[data-store]").attr("data-store");
            $.post("{{ url_for('decrement_item_count') }}", {"shopping-list": shoppingListName, "sku": itemSku, "store": itemStore})
                .done(function(data) {
                    if (data["quantity"] > 0) {
                        decrBtn.parents(".quantity-section").children(".quantity").text(data["quantity"]);
                    } else {
                        decrBtn.parents(".quantity-section").children(".quantity").text(0);
                        toggleDecr(decrBtn, true);
                    }
                })
                .fail(function(jqXHR, textStatus) {
                    alert(textStatus);
                });
        });
    toggleDecr(decrBtn, itemQuantity <= 0);
    return decrBtn;
}

function incrButton(shoppingListName, itemName) {
    return faButton("fa", "fa-plus-square", {"color": "limegreen", "size": "lg"})
        .addClass("incr-btn")
        .click(function() {
            var incrBtn = $(this);
            var itemSku = $(this).parents("li[data-sku]").attr("data-sku");
            var itemStore = $(this).parents("li[data-store]").attr("data-store");
            $.post("{{ url_for('increment_item_count') }}", {"shopping-list": shoppingListName, "sku": itemSku, "store": itemStore})
                .done(function(data) {
                    if (data["quantity"] > 0) {
                        incrBtn.parents(".quantity-section").children(".quantity").text(data["quantity"]);
                        toggleDecr(incrBtn.parents(".quantity-section").children(".decr-btn"), false);
                    }
                })
                .fail(function(jqXHR, textStatus) {
                    alert(textStatus);
                });
        });
}

function quantityBadge(itemQuantity) {
    return $("<div></div>")
        .addClass("badge")
        .addClass("badge-pill")
        .addClass("badge-light")
        .addClass("quantity")
        .css("font-size", "0.9em")
        .text(itemQuantity);
}

function quantityButtons(shoppingListName, itemName, itemQuantity) {
    return $("<div></div>")
        .addClass("quantity-section")
        .append(decrButton(shoppingListName, itemName, itemQuantity))
        .append(quantityBadge(itemQuantity))
        .append(incrButton(shoppingListName, itemName));
}