from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__, static_folder='.')
CORS(app)

DB_PATH = 'database.sqlite'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS corners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imageName TEXT,
            nameEn TEXT,
            nameAr TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cornerId INTEGER,
            nameEn TEXT,
            nameAr TEXT,
            price TEXT,
            FOREIGN KEY(cornerId) REFERENCES corners(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute('PRAGMA foreign_keys = ON')
    return conn

# Serve frontend files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# 1. Admin Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if data.get('username') == 'IbrahimA.Hamada' and data.get('password') == 'admin123':
        return jsonify({"success": True, "token": "fake-jwt-token-for-demo"})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

# 2. Fetch All Corners with Items
@app.route('/api/corners', methods=['GET'])
def get_corners():
    conn = get_db_connection()
    corners = conn.execute('SELECT * FROM corners').fetchall()
    items = conn.execute('SELECT * FROM items').fetchall()
    conn.close()

    result = []
    for corner in corners:
        corner_dict = dict(corner)
        corner_dict['items'] = [dict(i) for i in items if i['cornerId'] == corner['id']]
        result.append(corner_dict)
    
    return jsonify(result)

# 3. Add a New Corner
@app.route('/api/corners', methods=['POST'])
def add_corner():
    data = request.json
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO corners (imageName, nameEn, nameAr) VALUES (?, ?, ?)',
              (data['imageName'], data['nameEn'], data['nameAr']))
    conn.commit()
    corner_id = c.lastrowid
    conn.close()
    return jsonify({"id": corner_id, **data})

# 4. Delete a Corner
@app.route('/api/corners/<int:id>', methods=['DELETE'])
def delete_corner(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM corners WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# 5. Add a New Item
@app.route('/api/items', methods=['POST'])
def add_item():
    data = request.json
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO items (cornerId, nameEn, nameAr, price) VALUES (?, ?, ?, ?)',
              (data['cornerId'], data['nameEn'], data['nameAr'], data['price']))
    conn.commit()
    item_id = c.lastrowid
    conn.close()
    return jsonify({"id": item_id, **data})

# 6. Update an Item Price/Name
@app.route('/api/items/<int:id>', methods=['PUT'])
def update_item(id):
    data = request.json
    conn = get_db_connection()
    conn.execute('UPDATE items SET nameEn = ?, nameAr = ?, price = ? WHERE id = ?',
                 (data['nameEn'], data['nameAr'], data['price'], id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# 7. Delete an Item
@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM items WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(port=3000, debug=True)
