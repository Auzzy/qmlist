function decrButton(shoppingListName, itemName) {
    return $("<button></button>")
        .addClass("btn")
        .addClass("badge")
        .addClass("badge-danger")
        .addClass("decr-btn")
        .text("-")
        .click(function() {
            var decrBtn = $(this);
            $.post("{{ url_for('decrement_item_count') }}", {"shopping-list": shoppingListName, "item-name": itemName})
                .done(function(data) {
                    if (data["quantity"] > 0) {
                        decrBtn.parents(".quantity-section").children(".quantity").text(data["quantity"]);
                    } else {
                        decrBtn.parents(".quantity-section").children(".quantity").text(0);
                        decrBtn.remove();
                    }
                })
                .fail(function(jqXHR, textStatus) {
                    alert(textStatus);
                });
        });
}

function incrButton(shoppingListName, itemName) {
    return $("<button></button>")
        .addClass("btn")
        .addClass("badge")
        .addClass("badge-success")
        .addClass("incr-btn")
        .text("+")
        .click(function() {
            var incrBtn = $(this);
            $.post("{{ url_for('increment_item_count') }}", {"shopping-list": shoppingListName, "item-name": itemName})
                .done(function(data) {
                    if (data["quantity"] > 0) {
                        incrBtn.parents(".quantity-section").children(".quantity").text(data["quantity"]);
                        if (!incrBtn.parents(".quantity-section").children(".decr-btn").length) {
                            incrBtn.parents(".quantity-section").prepend(decrButton(itemName));
                        }
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
        .text(itemQuantity);
}

function quantityButtons(shoppingListName, itemName, itemQuantity) {
    var section = quantitySection(itemName, itemQuantity);

    if (itemQuantity > 0) {
        decrButton(shoppingListName, itemName).insertBefore(section.children());
    }

    return section.append(incrButton(shoppingListName, itemName));
}

function quantitySection(itemName, itemQuantity, ) {
    return $("<div></div>")
        .addClass("quantity-section")
        .append(quantityBadge(itemQuantity));
}