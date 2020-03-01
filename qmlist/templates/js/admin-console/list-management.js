function adminConsoleDisplayLists(lists) {
    $("#admin-console-lists-of-lists").empty();
    lists.forEach(list_info => {
        $("#admin-console-lists-of-lists")
            .append($("<li></li>")
                .addClass("list-group-item")
                .addClass("d-flex")
                .addClass("justify-content-between")
                .addClass("align-items-center")
                .attr("data-shopping-list", list_info["name"])
                .append($("<div></div>")
                    .text(list_info["name"]))
                .append($("<div></div>")
                    .append($("<a></a>")
                        .attr("href", "#")
                        .append($("<i></i>")
                            .addClass("fa")
                            .addClass("fa-edit")
                            .css("float", "left")
                            .css("margin-right", "5px"))
                        .click(function() {
                            $("#edit-list-datepicker").bootstrapMaterialDatePicker("setDate", list_info["departure"]);
                            $("#edit-list-datepicker").attr("data-shopping-list", list_info["name"]);
                            $("#edit-list-datepicker").click();
                        }))
                    .append($("<div></div>")
                        .css("font-style", "italic")
                        .css("float", "left")
                        .text(list_info["departure"]))));
    });
}

$("#admin-console-lists-tab, #admin-console-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            adminConsoleDisplayLists(data["lists"]);
        });
});

$("#new-list-button").click(function() {
    $("#create-list-form").css("display", "block");
    $("#create-list-name").val("");
    $("#create-list-datepicker").val("");
});

$("#create-list-cancel").click(function() {
    $("#create-list-form").css("display", "none");
    $("#create-list-name").val("");
    $("#create-list-datepicker").val("");
});

$("#create-list-submit").click(function() {
    $.post("{{ url_for('create_new_list') }}", {name: $("#create-list-name").val(), date: $("#create-list-datepicker").val()})
        .done(function(data) {
            adminConsoleDisplayLists(data["lists"]);
            loadShoppingListTab($("#create-list-name").val());
            $("#create-list-form").css("display", "none");
            $("#create-list-name").val("");
            $("#create-list-datepicker").val("");
        });
});

$("#create-list-datepicker").bootstrapMaterialDatePicker({
    format: 'ddd DD-MMM-YYYY HH:mm',
    switchOnClick: true
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker({
    format: 'ddd DD-MMM-YYYY HH:mm',
    switchOnClick: true,
    triggerEvent: "click"
});

$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("change", function() {
    var shoppingList = $("#edit-list-datepicker").attr("data-shopping-list");
    $.post("{{ url_for('update_departure') }}", {shopping_list: shoppingList, departure: $("#edit-list-datepicker").val()})
        .done(function(data) {
            $(`[data-shopping-list="${shoppingList}"] div div`).text(data["departure"]);
            $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
        });
});
$("#edit-list-datepicker").bootstrapMaterialDatePicker().on("close", function() {
    $("#edit-list-datepicker").removeAttr("data-shopping-list").val("");
});

// Since switchOnClick is true, we don't need the OK or Cancel buttons.
$(".dtp .dtp-btn-ok").addClass("hidden");
$(".dtp .dtp-btn-cancel").addClass("hidden");