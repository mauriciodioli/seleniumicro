from flask import Blueprint, request, jsonify
from extensions import db
from models.chats.message import Message

chat_bp = Blueprint('chat_bp', __name__, url_prefix='/chats')

@chat_bp.route('/enviar', methods=['POST'])
def enviar_mensaje():
    data = request.get_json()
    mensaje = Message(
        conversation_id=data.get('conversation_id'),
        sender_id=data.get('sender_id'),
        sender_type=data.get('sender_type'),
        content=data.get('content')
    )
    db.session.add(mensaje)
    db.session.commit()
    return jsonify({'ok': True, 'mensaje_id': mensaje.id})
