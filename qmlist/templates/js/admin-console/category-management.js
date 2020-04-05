function _createSubcategoryButton() {
    return faButton("fa", "fa-chevron-right", {color: "black", "margin-left": "10px", "margin-right": "10px"})
        .click(function() {
            var categoryRow = $(this).parents(`[data-name]`);
            var store = categoryRow.parents("[data-store]").attr("data-store");
            var category = categoryRow.attr("data-name");
            $.get("{{ url_for('load_subcategories') }}", {store: store, category: category})
                .done((data) => {
                    var column = categoryRow.parent();

                    column.find(`[data-name='${category}'] button`).removeClass("collapsed");
                    column.find(`:not([data-name='${category}']) button`).addClass("collapsed");

                    column.nextAll().remove();
                    column.parent()
                        .append(_displayStoreCategories(data["subcategories"], category));
                });
        })
}

function _createCategoryButton(name, enabled) {
    var categoryButton = $("<button></button>")
        .attr("type", "button")
        .addClass("btn")
        .addClass("btn-sm")
        .addClass(enabled ? "btn-outline-success" : "btn-outline-danger")
        .css("float", "left")
        .text(name)
        .click(function(event) {
            var categoryRow = $(this).parents(`[data-name]`);
            var buttonEnabled = categoryRow.attr("data-enabled");
            var store = categoryRow.parents("[data-store]").attr("data-store");
            var category = categoryRow.attr("data-name");
            var parent = categoryRow.attr("data-parent");
            if (buttonEnabled === "true") {
                $.post("{{ url_for('category_disable') }}", {store: store, category: category})
                    .done(() => {
                        $(this)
                            .removeClass("btn-outline-success")
                            .addClass("btn-outline-danger");

                        categoryRow
                            .attr("data-enabled", "false");

                        if (!$(this).hasClass("collapsed")) {
                            categoryRow.parent().nextAll().find("[data-enabled]")
                                .attr("data-enabled", "false");

                            categoryRow.parent().nextAll().find("button")
                                .removeClass("btn-outline-success")
                                .addClass("btn-outline-danger");
                        }
                    });
            } else {
                if (parent === undefined || categoryRow.parent().prev().find(`[data-name='${parent}']`).attr("data-enabled") === "true") {
                    var propagate = event.ctrlKey;
                    $.post("{{ url_for('category_enable') }}", {store: store, category: category, propagate: propagate})
                        .done(() => {
                            $(this)
                                .removeClass("btn-outline-danger")
                                .addClass("btn-outline-success");
                            
                            $(this).parents(`[data-name]`)
                                .attr("data-enabled", "true");

                            if (propagate && !$(this).hasClass("collapsed")) {
                                categoryRow.parent().nextAll().find("[data-enabled]")
                                    .attr("data-enabled", "true");

                                categoryRow.parent().nextAll().find("button")
                                    .removeClass("btn-outline-danger")
                                    .addClass("btn-outline-success");
                            }
                        });
                }
            }
        });

    
    return categoryButton;
}

function _displayStoreCategories(categories, parent) {
    var column = $("<div></div>")
        .css("float", "left");

    categories
        .sort((cat1, cat2) => cat1["name"].localeCompare(cat2["name"]))
        .forEach(category => {
            var categorySection = $("<div></div>")
                .css("margin-top", "5px")
                .css("margin-bottom", "5px")
                .attr("data-name", category["name"])
                .attr("data-enabled", category["enabled"])
                .append(_createCategoryButton(category["name"], category["enabled"]));

            if (parent !== undefined && parent !== null) {
                categorySection.attr("data-parent", parent);
            }

            if (category["hasChildren"]) {
                categorySection.append(_createSubcategoryButton());
            }

            column
                .append(categorySection)
                .append($("<div></div>")
                    .css("clear", "both"));
    });

    return column;
}

function loadCategories() {
    $.get("{{ url_for('load_subcategories') }}", {"store": "Restaurant Depot"})
        .done(function(data) {
            $("#admin-console-rd-categories")
                .append(_displayStoreCategories(data["subcategories"]));
        });
    $.get("{{ url_for('load_subcategories') }}", {"store": "BJs"})
        .done(function(data) {
            $("#admin-console-bjs-categories")
                .append(_displayStoreCategories(data["subcategories"]));
        });
}

$("#admin-console-categories-tab").on("show.bs.tab", function() {
    loadCategories();
});
