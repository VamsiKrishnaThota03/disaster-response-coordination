import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import DisasterForm from './components/DisasterForm';
import DisasterList from './components/DisasterList';
import AuthModal from './components/AuthModal';
import { apiFetch } from './lib/api';
import { useAuth } from './context/AuthContext';
import socketService from './services/socketService';

function ConnectionDot({ connected }) {
  return (
    <Tooltip label={connected ? 'Receiving live updates' : 'Live updates unavailable, retrying…'}>
      <HStack spacing={2} fontSize="xs" color="gray.400" aria-live="polite">
        <Box w={2} h={2} borderRadius="full" bg={connected ? 'green.400' : 'gray.500'} boxShadow={connected ? '0 0 0 3px rgba(72,187,120,.25)' : 'none'} />
        <Text>{connected ? 'Live' : 'Offline'}</Text>
      </HStack>
    </Tooltip>
  );
}

function StatCard({ label, value, color }) {
  return (
    <Stat bg="gray.800" borderWidth="1px" borderColor="gray.700" borderRadius="lg" px={4} py={3}>
      <StatLabel color="gray.400" fontSize="xs" textTransform="uppercase" letterSpacing="wide">
        {label}
      </StatLabel>
      <StatNumber color={color} fontSize="2xl">
        {value}
      </StatNumber>
    </Stat>
  );
}

function App() {
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const form = useDisclosure();
  const authModal = useDisclosure();
  const { user, signOut } = useAuth();

  const fetchDisasters = useCallback(async () => {
    try {
      const data = await apiFetch('/api/disasters');
      setDisasters(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    socketService.connect();
    socketService.addListener('connect', () => setIsConnected(true));
    socketService.addListener('disconnect', () => setIsConnected(false));
    socketService.addListener('connect_error', () => setIsConnected(false));
    socketService.addListener('disaster_updated', () => fetchDisasters());

    fetchDisasters();

    return () => {
      ['connect', 'disconnect', 'connect_error', 'disaster_updated'].forEach((e) => socketService.removeAllListeners(e));
      socketService.disconnect();
    };
  }, [fetchDisasters]);

  const stats = useMemo(() => {
    const active = disasters.filter((d) => d.status === 'active').length;
    const high = disasters.filter((d) => d.priority === 'high').length;
    return { total: disasters.length, active, high };
  }, [disasters]);

  const openReportForm = () => (user ? form.onOpen() : authModal.onOpen());

  return (
    <Box minH="100vh">
      <Box as="header" borderBottomWidth="1px" borderColor="gray.700" bg="rgba(15,21,32,.85)" backdropFilter="blur(8px)" position="sticky" top={0} zIndex="sticky">
        <Container maxW="container.xl" py={3}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <HStack spacing={3}>
              <Flex w={9} h={9} borderRadius="lg" bg="red.500" align="center" justify="center" color="white" aria-hidden="true">
                <FaExclamationTriangle />
              </Flex>
              <Box>
                <Heading as="h1" size="sm" letterSpacing="tight">
                  Disaster Response
                </Heading>
                <ConnectionDot connected={isConnected} />
              </Box>
            </HStack>

            <HStack spacing={2}>
              <Button colorScheme="red" size="sm" onClick={openReportForm} leftIcon={<FaExclamationTriangle />}>
                Report disaster
              </Button>
              {user ? (
                <Menu placement="bottom-end">
                  <MenuButton aria-label="Account menu">
                    <Avatar size="sm" name={user.email} bg="blue.500" />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <Text px={3} py={2} fontSize="sm" color="gray.400" noOfLines={1}>
                      {user.email}
                    </Text>
                    <MenuItem bg="gray.800" _hover={{ bg: 'gray.700' }} icon={<FaSignOutAlt />} onClick={signOut}>
                      Sign out
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button size="sm" variant="outline" colorScheme="gray" onClick={authModal.onOpen}>
                  Sign in
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={{ base: 6, md: 8 }}>
        <Box mb={6}>
          <Heading size="lg" letterSpacing="tight" mb={1}>
            Coordinate the response
          </Heading>
          <Text color="gray.400">Track active disasters, field reports and nearby relief resources in real time.</Text>
        </Box>

        <SimpleGrid columns={{ base: 3 }} spacing={{ base: 2, md: 4 }} mb={8} maxW="640px">
          <StatCard label="Disasters" value={loading || error ? '–' : stats.total} color="gray.100" />
          <StatCard label="Active" value={loading || error ? '–' : stats.active} color="green.300" />
          <StatCard label="High priority" value={loading || error ? '–' : stats.high} color="red.300" />
        </SimpleGrid>

        {error && (
          <Alert status="error" borderRadius="lg" mb={6} bg="red.900" color="red.100">
            <AlertIcon color="red.200" />
            <AlertDescription flex="1">Couldn&apos;t load disasters: {error}</AlertDescription>
            <Button size="sm" colorScheme="red" variant="outline" onClick={() => { setLoading(true); fetchDisasters(); }}>
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={4}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height="300px" borderRadius="lg" startColor="gray.800" endColor="gray.700" />
            ))}
          </SimpleGrid>
        ) : (
          !error && <DisasterList disasters={disasters} onRequireAuth={authModal.onOpen} onCreate={openReportForm} />
        )}
      </Container>

      <Modal isOpen={form.isOpen} onClose={form.onClose} size="xl" isCentered scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderWidth="1px" borderColor="gray.700" mx={4}>
          <ModalHeader>Report a new disaster</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <DisasterForm
              onDisasterCreated={() => {
                fetchDisasters();
                form.onClose();
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <AuthModal isOpen={authModal.isOpen} onClose={authModal.onClose} />
    </Box>
  );
}

export default App;
