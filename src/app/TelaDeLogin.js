import React, { useState } from "react";
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { auth, firebaseConfig } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState("");
  const [loginErrorMessage, setLoginErrorMessage] = useState("");

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLoginErrorMessage("Digite seu e-mail.");
      return;
    }

    if (!password) {
      setLoginErrorMessage("Digite sua senha.");
      return;
    }

    try {
      setLoginErrorMessage("");
      await signInWithEmailAndPassword(auth, trimmedEmail, password);

      // Salva o estado de login no AsyncStorage
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userEmail', trimmedEmail);
      await AsyncStorage.setItem('userPassword', password);

      navigation.replace("Chat");
    } catch (error) {
      setLoginErrorMessage("E-mail ou senha incorretos.");
    }
  };

  const handlePasswordReset = async () => {
    const targetEmail = (resetEmail || email).trim();

    if (!targetEmail) {
      Alert.alert("E-mail necessário", "Digite o e-mail da sua conta para receber o link de recuperação.");
      return;
    }

    try {
      setIsResettingPassword(true);
      setResetErrorMessage("");

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestType: "PASSWORD_RESET",
            email: targetEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message;

        if (errorMessage === "EMAIL_NOT_FOUND") {
          setResetErrorMessage("E-mail não encontrado no nosso sistema.");
        } else if (errorMessage === "INVALID_EMAIL") {
          setResetErrorMessage("Digite um e-mail válido.");
        } else {
          setResetErrorMessage(errorMessage || "Não foi possível completar a recuperação de senha.");
        }
        return;
      }

      setResetEmail("");
      setResetSent(true);
    } catch (error) {
      Alert.alert("Erro ao enviar o link", error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <LinearGradient
      // Background Linear Gradient
      colors={['#00FF4C', '#009959']}
      style={styles.background}
    >
      <View style={styles.containerDecoracao}></View>
      <Image source={require("./decoracoes/E o papo continua!.png")}  style={{marginTop: 100, marginBottom: 20, width: 350, height: 40,}}/>

      {!showResetForm && !resetSent ? (
        <>
          <TextInput
            style={[styles.input, loginErrorMessage ? styles.inputError : null]}
            placeholder="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (loginErrorMessage) {
                setLoginErrorMessage("");
              }
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, loginErrorMessage ? styles.inputError : null]}
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (loginErrorMessage) {
                setLoginErrorMessage("");
              }
            }}
          />
          {loginErrorMessage ? (
            <Text style={styles.inlineErrorText}>{loginErrorMessage}</Text>
          ) : null}
          <View style={styles.containerCriarConta}>
            <Text style={styles.naotemContaTXT}>Não tem uma conta? <Text onPress={() => navigation.navigate("Register")} style={styles.naotemContaTXT2}>Criar</Text></Text>
          </View>
          <TouchableOpacity style={styles.btnEntrar} onPress={handleLogin}>
            <Text title="Entrar" style={styles.btnEntrarTXT}>Entrar</Text>
          </TouchableOpacity>

          <View style={styles.resetContainer}>
            <TouchableOpacity onPress={() => setShowResetForm(true)}>
              <Text style={styles.resetLabel}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {showResetForm && !resetSent ? (
        <View style={styles.resetFormContent}>
          <Text style={styles.resetTitle}>Recuperar senha</Text>
          <TextInput
            style={styles.resetInput}
            placeholder="Digite seu e-mail para recuperar"
            value={resetEmail}
            onChangeText={setResetEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {resetErrorMessage ? (
            <Text style={styles.resetErrorText}>{resetErrorMessage}</Text>
          ) : null}

          <TouchableOpacity style={styles.btnResetar} onPress={handlePasswordReset} disabled={isResettingPassword}>
            {isResettingPassword ? (
              <ActivityIndicator color="#009959" />
            ) : (
              <Text style={styles.btnResetarTXT}>Enviar link de recuperação</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => {
            setShowResetForm(false);
            setResetEmail("");
            setResetErrorMessage("");
          }}>
            <Text style={styles.btnVoltarTXT}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {resetSent ? (
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Email enviado para você</Text>
          <Text style={styles.successText}>Verifique também a sua pasta de spam.</Text>
          <TouchableOpacity style={styles.btnVoltar} onPress={() => {
            setResetSent(false);
            setShowResetForm(false);
            setResetEmail("");
            setResetErrorMessage("");
          }}>
            <Text style={styles.btnVoltarTXT}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Image source={require("./decoracoes/figureFoto.png")} style={styles.figureimagemFoto} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  containerDecoracao: {
    height: 200,
    backgroundColor: 'rgba(9, 8, 20, 0.27)',
    width: 400,
    position: 'absolute',
    borderBottomRightRadius: 1000,
    borderBottomLeftRadius: 1000,
    marginRight: 400,
    zIndex: 0
  },
  figureimagemFoto: {
    width: 361.21,
    height: 414,
    marginRight: 135,
    marginTop: 10
  },
  naotemContaTXT: {
    fontSize: 16,
    fontWeight: 300,
    color: 'white'
  },
  naotemContaTXT2: {
    textDecorationLine: 'underline',
    fontWeight: 700,
  },
  containerCriarConta: {
    width: 300,
    alignItems: 'center',
    flexWrap: 'nowrap',
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  resetContainer: {
    width: 300,
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  resetLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  resetFormContent: {
    width: 300,
    alignItems: 'center',
    marginTop: 10,
  },
  resetTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  successContainer: {
    width: 300,
    alignItems: 'center',
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  successTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  resetErrorText: {
    color: '#ffe6e6',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  resetInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 0,
    width: 300,
    borderColor: 'rgba(41, 41, 41, 0.21)',
    backgroundColor: 'white',
    zIndex: 2,
    marginBottom: 8,
  },
  btnEntrarTXT: {
    fontWeight: 900,
    fontSize: 20
  },
  btnEntrar: {
    backgroundColor: "white",
    width: 300,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  btnResetar: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 300,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  btnResetarTXT: {
    fontWeight: '700',
    fontSize: 14,
    color: '#009959',
  },
  btnVoltar: {
    marginTop: 8,
    paddingVertical: 8,
  },
  btnVoltarTXT: {
    color: 'white',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "grey"
  },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 0,
    width: 300,
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
    width: 300,
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
    justifyContent: 'flex-start',
    backgroundColor: 'orange',
    flex: 1,
  },
});
