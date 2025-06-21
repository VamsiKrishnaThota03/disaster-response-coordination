import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Badge,
  Link,
  Divider,
  Icon,
  HStack,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaExternalLinkAlt, FaBuilding, FaClock } from 'react-icons/fa';
import { BACKEND_URL } from '../config';

const UpdateCard = ({ update }) => {
  const cardBg = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const textColor = useColorModeValue('gray.100', 'gray.100');
  const metaColor = useColorModeValue('gray.400', 'gray.400');

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg={cardBg}
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ 
        transform: 'translateY(-2px)', 
        shadow: 'dark-lg',
        borderColor: 'gray.600'
      }}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Badge 
            colorScheme={update.source === 'FEMA' ? 'blue' : 'red'} 
            variant="solid"
            borderRadius="full"
          >
            {update.source}
          </Badge>
          <Text fontSize="sm" color={metaColor}>
            <Icon as={FaClock} mr={1} />
            {new Date(update.timestamp).toLocaleString()}
          </Text>
        </HStack>

        <Heading size="sm" color={textColor}>
          {update.title}
        </Heading>

        <Text color={textColor} fontSize="sm">
          {update.content}
        </Text>

        {update.url && (
          <Link 
            href={update.url} 
            isExternal 
            color="blue.400"
            fontSize="sm"
            display="flex"
            alignItems="center"
          >
            Read more <Icon as={FaExternalLinkAlt} ml={1} boxSize={3} />
          </Link>
        )}

        <HStack color={metaColor} fontSize="sm">
          <Icon as={FaBuilding} />
          <Text>{update.organization}</Text>
        </HStack>
      </VStack>
    </Box>
  );
};

const OfficialUpdates = ({ disasterId }) => {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUpdates();
  }, [disasterId]);

  const fetchUpdates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/disasters/${disasterId}/official-updates`);
      if (!response.ok) {
        throw new Error('Failed to fetch official updates');
      }

      const data = await response.json();
      setUpdates(data);
    } catch (error) {
      console.error('Error fetching official updates:', error);
      setError('Failed to load official updates. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        p={4} 
        bg="red.900" 
        color="white" 
        borderRadius="md"
        textAlign="center"
      >
        {error}
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {updates.length > 0 ? (
        updates.map((update, index) => (
          <UpdateCard key={update.id || index} update={update} />
        ))
      ) : (
        <Box 
          textAlign="center" 
          py={8}
          borderWidth="1px"
          borderRadius="lg"
          borderStyle="dashed"
          borderColor="gray.600"
        >
          <Icon as={FaBuilding} w={8} h={8} color="gray.400" mb={3} />
          <Text color="gray.400">No official updates available yet.</Text>
        </Box>
      )}
    </VStack>
  );
};

export default OfficialUpdates; 