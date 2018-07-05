from flask import Flask
from flask_security import Security
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object("qmlist.settings")

csrf = CSRFProtect(app)
db = SQLAlchemy(app)
security = Security()

# Initialized in models.py
user_datastore = None

