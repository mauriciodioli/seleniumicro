# Creating  Routes
from pipes import Template
from unittest import result
from flask import current_app

import requests
import json
from flask import Blueprint, render_template, request, redirect, url_for, flash,jsonify
from utils.db import db

import jwt
import asyncio
from models.usuario import Usuario

from collections import defaultdict
#from turing.turingRespuestas import respuestaIa



chat = Blueprint('chat',__name__)



# Definimos un contexto básico (esto debería ser más específico a tu sistema)
# Definimos un contexto más específico a tu sistema
context = """
Este bot automatizado opera tanto en mercados locales como internacionales, con un retorno mensual del 2%. Ideal para aquellos que buscan beneficios mensuales constantes con un total de 24% + capital.
Sistema de Operaciones: Un sistema que permite a los usuarios operar de manera semiautomática, facilitando la toma de decisiones informadas con un máximo retorno mensual del 2%. Obtén un total de 240% + capital anual.
Cursos: Ofrecemos una variedad de cursos online sobre trading y otros temas relevantes, con materiales de estudio y un costo mensual accesible. Ideal para mejorar tus habilidades y conocimientos.
Motor de Operaciones: Implementa estrategias propias con un retorno mensual del 2.5%. Este servicio permite obtener beneficios anuales significativos, con un retorno de capital garantizado y un total de 300% + capital.
Copy Trading: Permite a los usuarios copiar estrategias de trading exitosas y subir sus propias estrategias, con un máximo retorno mensual del 2% y un total de 240% + capital anual.
Panel de Señales: Proporciona señales diarias para operar, ayudando a los usuarios a identificar oportunidades en el mercado. Aunque no garantiza el retorno de capital, ofrece un total de 240% anual.
Sistema de Fichas: Comparte tus fichas y sigue tus inversiones con un retorno del 0.65% por ficha. Este sistema facilita el seguimiento y la optimización de tus activos.
CF Fintech: Una oportunidad para compartir tu negocio y recibir beneficios mensuales, con un costo inicial y un porcentaje de capital. Ideal para emprendedores en el sector financiero.
"""



# Simulamos una base de datos en memoria
administrators = defaultdict(list)  # Cada administrador tiene una lista de hilos (máx. 10)
conversations = defaultdict(list)  # Cada usuario tiene una lista de mensajes
# Conversaciones y administradores deben estar definidos antes de la función
conversations = {}
administrators = {}
user_states = {}  # Para llevar el estado de cada usuario
# Simulamos administradores disponibles
admin_list = ["admin1", "admin2"]

# Obtener un administrador disponible (menos de 10 hilos activos)
def assign_admin():
    for admin, threads in administrators.items():
        if len(threads) < 10:
            return admin
    return None

# API para manejar el hilo de mensajes


@chat.route('/send_message/', methods=['POST']) 
def send_message():
    data = request.get_json()
    
    if 'userId' not in data or 'message' not in data:
        return jsonify({"status": "error", "message": "Faltan datos"}), 400

    user_id = data['userId']
    message = data['message']

    # Inicializa el estado de la conversación si es un nuevo usuario
    if user_id not in user_states:
        user_states[user_id] = "greeting"  # Estado inicial

    response_message = handle_message(user_id, message)
    
    return jsonify({
        "status": "Mensaje enviado",
        "userId": user_id,
        "reply": response_message
    })

def handle_message(user_id, message):
    state = user_states.get(user_id, "greeting")

    # Creamos un objeto compatible con .descripcion
    class Pregunta:
        def __init__(self, descripcion):
            self.descripcion = descripcion

    pregunta = Pregunta(message)
    print(f"Mensaje recibido: {pregunta.descripcion}")
    print(f"state: {state}")
    if state == "greeting":
        if message.lower() in ["hola", "buen día", "buenas tardes"]:
            user_states[user_id] = "waiting_for_request"
            return "¡Hola! ¿Qué se le ofrece?"
        else:
            return "Lo siento, no entiendo eso. ¿Puedes saludarme?"

    elif state == "waiting_for_request":
        if any(keyword in message.lower() for keyword in ["costos", "quiero saber sobre costos", "cuánto cuesta", "costos de utilización"]):
            return (
                "Los costos de utilización son los siguientes:\n"
                "- Bot automatizado: 2% de retorno mensual.\n"
                "- Sistema de operaciones: 240% + capital anual.\n"
                "- Cursos online: costo mensual accesible.\n"
                "- Copy trading: 2% de retorno mensual y 240% + capital anual.\n"
                "- Sistema de fichas: 0.65% por ficha."
            )

        if "consulta" in message.lower():
            user_states[user_id] = "consultation"
            return "Claro, ¿qué consulta tienes sobre nuestros servicios?"

        # ✅ Usar GPT-4
        # El contexto debe incluir lo que se ha hablado hasta ahora
        contexto = [
            {"role": "system", "content": "Responde como un experto en ventas sobre los servicios ofrecidos."},
            {"role": "user", "content": message}  # Incluir el mensaje actual del usuario
        ]

       # respuesta = respuestaIa(pregunta, selectedModel="gpt4", contexto=contexto)
       
        # Manejar si se devuelve un dict de error
        #if isinstance(respuesta, tuple):
        #    respuesta = respuesta[0].get("error", "No se pudo obtener una respuesta del modelo.")

        #return respuesta

    return "Lo siento, no entendí tu mensaje."




# Obtener hilos de mensajes para un administrador
@chat.route('/admin/get_threads', methods=['GET'])
def get_threads():
    admin = request.args.get('admin')  # Nombre del administrador
    threads = [{"userId": user_id, "lastMessage": conversations[user_id][-1]["text"]}
               for user_id in administrators[admin]]
    return jsonify(threads)

# Obtener conversación completa de un hilo
@chat.route('/admin/get_conversation/<int:user_id>', methods=['GET'])
def get_conversation(user_id):
    return jsonify(conversations[user_id])

# Enviar respuesta del administrador a un hilo
@chat.route('/admin/send_reply', methods=['POST'])
def send_reply():
    data = request.get_json()
    user_id = data['userId']
    message = data['message']
    
    conversations[user_id].append({"sender": "admin", "text": message})
    
    return jsonify({"status": "Respuesta enviada"})


# Notify when a new user starts chatting (triggered from the server)
@chat.route('/new_chat', methods=['POST'])
def new_chat():
    data = request.get_json()
    user_id = data['userId']
    
    # Logic to notify the frontend (maybe using WebSockets for real-time)
    return jsonify({"newChat": True, "userId": user_id})
