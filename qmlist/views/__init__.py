from flask import render_template
from flask_security import current_user, login_required

from qmlist import model
from qmlist.qmlist import app

from qmlist.views import makelist


@app.route("/")
@login_required
def home():
    default_list = model.ShoppingList.next()
    default_list_name = default_list.name if default_list else None
    return render_template('index.html', default_list_name=default_list_name, is_admin=current_user.has_role("admin"))