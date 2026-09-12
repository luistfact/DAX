"""Aplicación ZonaAzul: interfaz de análisis retrospectivo de partidas de PUBG."""

import streamlit as st

SECCIONES = ("Mi Perfil", "Mi Última Partida", "Mi Estilo de Juego", "Asistente")

TEXTO_TRATAMIENTO = (
    "Este análisis usará tu nombre de usuario de PUBG y datos públicos de tus "
    "partidas recientes, obtenidos mediante la PUBG Developer API, únicamente "
    "para generar el análisis que se muestra durante esta sesión. No se "
    "almacenan datos de otros jugadores más allá de la sesión, y la "
    "herramienta es de análisis retrospectivo: no predice partidas futuras "
    "ni ofrece ventaja competitiva en tiempo real."
)


def inicializar_estado():
    """Crea las claves de session_state que usa la app si todavía no existen."""
    if "acepto_tratamiento" not in st.session_state:
        st.session_state.acepto_tratamiento = False
    if "nombre_usuario" not in st.session_state:
        st.session_state.nombre_usuario = ""


def render_acceso():
    """Aviso de tratamiento de datos; el campo de usuario solo se habilita al aceptarlo."""
    st.sidebar.subheader("Acceso")
    with st.sidebar.expander(
        "Aviso de tratamiento de datos",
        expanded=not st.session_state.acepto_tratamiento,
    ):
        st.write(TEXTO_TRATAMIENTO)

    st.session_state.acepto_tratamiento = st.sidebar.checkbox(
        "Acepto el tratamiento de datos descrito arriba",
        value=st.session_state.acepto_tratamiento,
    )
    st.session_state.nombre_usuario = st.sidebar.text_input(
        "Nombre de usuario de PUBG",
        value=st.session_state.nombre_usuario,
        disabled=not st.session_state.acepto_tratamiento,
        placeholder="Acepta el aviso para escribir tu usuario",
    )


def estado_vacio(mensaje: str):
    """Muestra un estado vacío de una línea en vez de dejar la sección en blanco."""
    st.info(mensaje)


def render_mi_perfil():
    st.header("Mi Perfil")
    estado_vacio(
        "Aquí verás tus estadísticas de temporada y la lista de tus partidas recientes."
    )


def render_mi_ultima_partida():
    st.header("Mi Última Partida")
    estado_vacio(
        "Aquí verás la curva de probabilidad por fase del círculo y el mapa "
        "con la trayectoria de tu escuadrón."
    )


def render_mi_estilo_de_juego():
    st.header("Mi Estilo de Juego")
    estado_vacio(
        "Aquí verás el perfil de estilo de juego asignado por el modelo, "
        "con una gráfica de radar contra el promedio."
    )


def render_asistente():
    st.header("Asistente")
    estado_vacio(
        "Aquí podrás conversar sobre el análisis de la partida que hayas cargado."
    )


SECCION_A_RENDER = {
    "Mi Perfil": render_mi_perfil,
    "Mi Última Partida": render_mi_ultima_partida,
    "Mi Estilo de Juego": render_mi_estilo_de_juego,
    "Asistente": render_asistente,
}


def main():
    st.set_page_config(page_title="ZonaAzul", page_icon="🪂", layout="wide")
    inicializar_estado()

    st.title("ZonaAzul")
    st.caption("Análisis retrospectivo de partidas de PUBG. No predice resultados futuros.")

    render_acceso()
    seccion = st.sidebar.radio("Navegación", SECCIONES)

    if not st.session_state.acepto_tratamiento:
        st.warning(
            "Acepta el aviso de tratamiento de datos en la barra lateral para "
            "habilitar el campo de usuario."
        )

    SECCION_A_RENDER[seccion]()


if __name__ == "__main__":
    main()
