function search(pageno) {
    var shoppingListName = $("#list-tab").attr("data-list-name");
    var searchTerm = $("#search-box").val();
    var itemCount = $("#search-item-count-dropdown").attr("data-item-count");
    $.get("{{ url_for('search') }}", {"shopping-list": shoppingListName, "search": searchTerm, "pageno": pageno, "item-count": itemCount})
        .done(function(results) {
            displayItems(results, shoppingListName, true);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        });
}

$("#search-button").click(function() {
    search(1);
});

$("#search-box").keypress(function(event){
    var keycode = (event.keyCode ? event.keyCode : event.which);
    // ENTER
    if(keycode == '13') {
        search(1);
    }
});

$("#nav-tabs").on("show.bs.tab", function(event) {
    if ($(event.target).attr("id") === "search-tab") {
        $("#search-box").val("");
        $("#search-items").empty();
        resetItemPagination();
    }
});

$("#nav-tabs").on("shown.bs.tab", function(event) {
    if ($(event.target).attr("id") === "search-tab") {
        attachItemPaginationListeners(search);
    }
});