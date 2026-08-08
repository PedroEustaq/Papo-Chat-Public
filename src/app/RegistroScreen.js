import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text, StatusBar, TouchableOpacity, Image } from "react-native";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { saveUserToFirestore } from "./FuncFirebase"; // Importa a função
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Adiciona um campo para o nome
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    if (!name.trim()) {
      setRegisterError("Digite seu nome.");
      return;
    }

    if (!trimmedEmail) {
      setRegisterError("Digite seu e-mail.");
      return;
    }

    if (!password) {
      setRegisterError("Digite sua senha.");
      return;
    }

    try {
      setLoading(true);
      setRegisterError("");
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // Salva o usuário no Firestore, incluindo o campo profileImg com valor vazio
      await saveUserToFirestore(user.uid, name, email, ""); // Passando string vazia para profileImg

      // Salva o estado de login no AsyncStorage
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userEmail', trimmedEmail);
      await AsyncStorage.setItem('userPassword', password);

      // Navega para a tela de chat
      navigation.replace("Chat");
    } catch (error) {
      setRegisterError("Não foi possível criar a conta. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      // Background Linear Gradient
      colors={['#00FF4C', '#009959']}
      style={styles.background}
    >
      <Image source={require("./decoracoes/CrieSuaConta.png")} style={styles.textoCriarCONT} />

      <TextInput
        style={[styles.input, registerError && !name.trim() ? styles.inputError : null]}
        placeholder="Nome"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (registerError) {
            setRegisterError("");
          }
        }}
        editable={!loading}
      />
      <TextInput
        style={[styles.input, registerError && !email.trim() ? styles.inputError : null]}
        placeholder="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (registerError) {
            setRegisterError("");
          }
        }}
        editable={!loading}
      />
      <TextInput
        style={[styles.input, registerError && !password ? styles.inputError : null]}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (registerError) {
            setRegisterError("");
          }
        }}
        editable={!loading}
      />
      {registerError ? (
        <Text style={styles.inlineErrorText}>{registerError}</Text>
      ) : null}
      <TouchableOpacity 
        style={[styles.btnEntrar, loading && styles.btnDisabled]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.btnEntrarTXT}>
          {loading ? 'Registrando...' : 'Entrar'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  btnEntrarTXT: {
    fontWeight: 900,
    fontSize: 20
  },
  btnEntrar: {
    backgroundColor: "white",
    width: '90%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  textoCriarCONT: {
    width: 320,
    height: 42,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 0
  },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 0,
    width: '90%',
    borderColor: 'rgba(41, 41, 41, 0.21)',
    backgroundColor: 'white',
    zIndex: 2,
  },
  inputError: {
    borderColor: '#ff4d4f',
  },
  inlineErrorText: {
    color: '#ff4d4f',
    fontSize: 13,
    marginBottom: 8,
    width: '90%',
    textAlign: 'left',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  background: {
    position: 'relative',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'orange',
    flex: 1, 
    paddingBottom: 40,
  },
});



