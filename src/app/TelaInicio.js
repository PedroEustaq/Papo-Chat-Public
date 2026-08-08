import React, { useState, useEffect } from "react";
import { View, TextInput, Button, StyleSheet, Text, StatusBar, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Bold, } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
export default function TelaInicio({ navigation }) {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_700Bold,
    });

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                const userEmail = await AsyncStorage.getItem('userEmail');
                const userPassword = await AsyncStorage.getItem('userPassword');
                await signInWithEmailAndPassword(auth, userEmail, userPassword);
                if (isLoggedIn === 'true') {
                    navigation.replace('Chat');
                }
            } catch (error) {
                console.error('Erro ao verificar status de login:', error);
            }
        };

        checkLoginStatus();
    }, []);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <LinearGradient
            // Background Linear Gradient
            colors={['#00FF4C', '#009959']}
            style={styles.background}
        >
            <StatusBar
                backgroundColor="#00FF4C"
                barStyle="dark-content"
                translucent={true}
            />
            <View style={styles.containerLogoPapo}>
                <Image source={require("./decoracoes/PapoLogo.png")} />
            </View>
            <Text style={styles.sejabemvindoTXT}>Seja bem vindo</Text>
            <Text style={styles.sejabemvindoP}>Papo Chat, seu app de mensagens rapidas.</Text>

            <Image style={styles.pessoasFiguresCAPA} source={require("./decoracoes/FotoPessoasCapa.png")} />
            <View style={styles.redondobaixo}>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                    <Text style={styles.entrarTXT}>Entrar</Text>
                </TouchableOpacity>
            </View>

        </LinearGradient>

    );
}

const styles = StyleSheet.create({
    redondobaixo: {
        backgroundColor: 'rgba(9, 8, 20, 0.27)',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        borderTopLeftRadius: 2500,
        borderTopRightRadius: 2500,
    },
    entrarTXT: {
        color: 'black',
        backgroundColor: 'white',
        justifyContent: 'center',
        display: 'flex',
        alignContent: 'center',
        fontWeight: 400,
        fontSize: 20,
        fontFamily: 'Inter-Regular',
        padding: 15,
        paddingLeft: 150,
        paddingRight: 150,
        borderRadius: 30,
    },
    pessoasFiguresCAPA: {
        width: 437.97,
        height: 387,
        marginTop: 10,
    },
    sejabemvindoTXT: {
        color: 'white',
        letterSpacing: -1.8,
        fontSize: 55,
        fontWeight: 900,
        textShadowColor: 'black',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        fontFamily: 'Inter-Regular',
    },
    sejabemvindoP: {
        color: 'white',
        letterSpacing: -1.8,
        fontSize: 20,
        fontWeight: 400,
        fontFamily: 'Inter-Regular',
    },
    containerLogoPapo: {
        display: 'flex',
        marginTop: 0,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        backgroundColor: 'trasnparent',
        width: "100%",
        height: 130,
        paddingLeft: 10,
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
