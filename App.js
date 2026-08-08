import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './src/app/ThemeContext';
import ChatScreen from './src/app/ChatScreen';
import TelaDeLogin from './src/app/TelaDeLogin';
import TelaInicio from './src/app/TelaInicio';
import TelaPedidosAmizade from './src/app/TelaPedidosAmizade';
import ConfigPainel from './src/app/ConfigPainel';
import PrivateChat from './src/app/PrivateChat';
import RegistroScreen from './src/app/RegistroScreen';
import CustomScreen from './src/app/CustomScreen';
import GruposScreen from './src/app/GruposScreen';
import ChatGrupoScreen from './src/app/ChatGrupoScreen';
import CriarGrupoScreen from './src/app/CriarGrupoScreen';
import TrocarEmailScreen from './src/app/TrocarEmailScreen';
import TrocarSenhaScreen from './src/app/TrocarSenhaScreen';
import { useTheme } from './ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={TelaDeLogin} />
          <Stack.Screen name="Inicio" component={TelaInicio} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="PedidosAmizade" component={TelaPedidosAmizade} />
          <Stack.Screen name="Config" component={ConfigPainel} />
          <Stack.Screen name="PrivateChat" component={PrivateChat} />
          <Stack.Screen name="Registro" component={RegistroScreen} />
          <Stack.Screen name="Custom" component={CustomScreen} />
          <Stack.Screen name="Grupos" component={GruposScreen} />
          <Stack.Screen name="ChatGrupo" component={ChatGrupoScreen} />
          <Stack.Screen name="CriarGrupo" component={CriarGrupoScreen} />
          <Stack.Screen name="TrocarEmail" component={TrocarEmailScreen} />
          <Stack.Screen name="TrocarSenha" component={TrocarSenhaScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
} 