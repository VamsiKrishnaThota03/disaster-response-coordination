import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { enabled, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose();
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setInfo('Check your inbox to confirm your email, then sign in.');
          setMode('signin');
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(2px)" />
      <ModalContent bg="gray.800" borderWidth="1px" borderColor="gray.700" mx={4}>
        <ModalHeader>{mode === 'signin' ? 'Sign in' : 'Create an account'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {!enabled ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </AlertDescription>
            </Alert>
          ) : (
            <VStack as="form" spacing={4} onSubmit={submit} align="stretch">
              <Text fontSize="sm" color="gray.300">
                Anyone can browse disasters. Sign in to report disasters, submit reports and add resources.
              </Text>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">{error}</AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">{info}</AlertDescription>
                </Alert>
              )}
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>
              <Button type="submit" colorScheme="blue" isLoading={busy}>
                {mode === 'signin' ? 'Sign in' : 'Sign up'}
              </Button>
              <Button variant="link" size="sm" colorScheme="blue" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
