from flask_security import login_required, roles_required

from qmlist.qmlist import app
from qmlist.views.admin_console import categories, departments, items, shopping_lists, users

@app.route("/admin")
@login_required
@roles_required("admin")
def admin_console_home():
    pass