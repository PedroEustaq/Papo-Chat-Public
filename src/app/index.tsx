import React, { useState, useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider } from "./ThemeContext";
import LoginScreen from "./TelaDeLogin";
import RegisterScreen from "./RegistroScreen";
import ChatScreen from "./ChatScreen";
import TelaInicio from "./TelaInicio";
import PrivateChat from "./PrivateChat"; // Nova tela de chat privado
import ConfigPainel from "./ConfigPainel"; // Nova tela de chat privado
import PedidosAmizade from "./TelaPedidosAmizade"; // Nova tela de chat privado
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import ChatGrupoScreen from './ChatGrupoScreen';
import CriarGrupoScreen from './CriarGrupoScreen';
import TrocarEmailScreen from './TrocarEmailScreen';
import TrocarSenhaScreen from './TrocarSenhaScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState("Inicio");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        const userPassword = await AsyncStorage.getItem('userPassword');

        if (userEmail && userPassword) {
          try {
            await signInWithEmailAndPassword(auth, userEmail, userPassword);
            setInitialRoute("Chat");
          } catch (error) {
            console.log('Erro no login automático:', error);
            // Limpa credenciais inválidas
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userPassword');
            await AsyncStorage.removeItem('isLoggedIn');
            setInitialRoute("Inicio");
          }
        } else {
          setInitialRoute("Inicio");
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setInitialRoute("Inicio");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return null; // Ou um componente de loading se preferir
  }

  return (
    <ThemeProvider>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress,
            },
          }),
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
          },
        }}
      >
        <Stack.Screen name="Inicio" component={TelaInicio} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CriarGrupo" component={CriarGrupoScreen} />
        <Stack.Screen name="ChatGrupo" component={ChatGrupoScreen} />
        <Stack.Screen 
          name="PrivateChat" 
          component={PrivateChat}
          options={{
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            cardStyleInterpolator: ({ current, next, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="TrocarEmail" component={TrocarEmailScreen} />
        <Stack.Screen name="TrocarSenha" component={TrocarSenhaScreen} />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: {
                opacity: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.7, 1],
                }),
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="Config" 
          component={ConfigPainel} 
          options={{
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: {
                opacity: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="PedidosAmizade" 
          component={PedidosAmizade} 
          options={{
            cardStyle: { backgroundColor: 'transparent' },
            cardOverlayEnabled: true,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            cardStyleInterpolator: ({ current, next, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
                opacity: current.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.5, 1],
                }),
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        />
      </Stack.Navigator>
    </ThemeProvider>
  );
}



