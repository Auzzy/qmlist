function adminConsoleDisplayLists(lists) {
    $("#admin-console-lists-of-lists").empty();
    lists.forEach(list_info => {
        $("#admin-console-lists-of-lists")
            .append($("<li></li>")
                .addClass("list-group-item")
                .addClass("d-flex")
                .addClass("justify-content-between")
                .addClass("align-items-center")
                .append($("<div></div>")
                    .text(list_info["name"]))
                .append($("<div></div>")
                    .css("font-style", "italic")
                    .text(list_info["departure"])));
    });
}

$("#admin-console-lists-tab, #admin-console-tab").on("show.bs.tab", function() {
    $.get("{{ url_for('get_list_info') }}")
        .done(function(data) {
            adminConsoleDisplayLists(data["lists"]);
        });
});