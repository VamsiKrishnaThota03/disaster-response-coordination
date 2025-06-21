import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Badge,
  Grid,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  SimpleGrid,
  Wrap,
  WrapItem,
  Tag,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  HStack,
  Icon,
  Flex,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { FaMapMarkerAlt, FaExclamationCircle, FaFileAlt, FaPlus, FaHandHoldingHeart } from 'react-icons/fa';
import { MdAccessTime, MdPriorityHigh } from 'react-icons/md';
import ReportForm from './ReportForm';
import Reports from './Reports';
import ResourceForm from './ResourceForm';
import MapView from './MapView';
import OfficialUpdates from './OfficialUpdates';
import { BACKEND_URL } from '../config';

// Utility function for determining priority color
const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'red';
    case 'medium': return 'orange';
    case 'low': return 'green';
    default: return 'gray';
  }
};

const DisasterCard = ({ disaster, onClick, onReportClick }) => {
  const cardBg = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const tagBg = useColorModeValue('blue.900', 'blue.900');
  const textColor = useColorModeValue('gray.100', 'gray.100');
  const descriptionColor = useColorModeValue('gray.400', 'gray.400');
  const metaColor = useColorModeValue('gray.500', 'gray.500');

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      bg={cardBg}
      borderColor={borderColor}
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ 
        transform: 'translateY(-2px)', 
        shadow: 'dark-lg',
        borderColor: 'gray.600'
      }}
      height="320px"
      display="flex"
      flexDirection="column"
      maxW="280px"
      cursor="pointer"
      onClick={onClick}
    >
      <Box p={4} flex="1" display="flex" flexDirection="column">
        <Flex justify="space-between" align="center" mb={3}>
          <Badge 
            colorScheme={getPriorityColor(disaster.priority)}
            fontSize="xs"
            px={2}
            py={0.5}
            borderRadius="full"
          >
            <HStack spacing={1}>
              <Icon as={MdPriorityHigh} boxSize="3" />
              <Text fontSize="xs">{disaster.priority?.toUpperCase() || 'UNKNOWN'} PRIORITY</Text>
            </HStack>
          </Badge>
          <Badge 
            colorScheme={disaster.status === 'active' ? 'green' : 'gray'}
            variant="solid"
            borderRadius="full"
            fontSize="xs"
          >
            {disaster.status?.toUpperCase()}
          </Badge>
        </Flex>

        <Heading size="sm" mb={2} noOfLines={2} color={textColor}>
          {disaster.title}
        </Heading>

        <Text color={descriptionColor} mb={3} noOfLines={3} flex="1" fontSize="sm">
          {disaster.description}
        </Text>

        <HStack spacing={3} mb={3}>
          <HStack color={metaColor} spacing={1}>
            <Icon as={FaMapMarkerAlt} boxSize="3" />
            <Text fontSize="xs" noOfLines={1}>{disaster.location_name}</Text>
          </HStack>
          <HStack color={metaColor} spacing={1}>
            <Icon as={MdAccessTime} boxSize="3" />
            <Text fontSize="xs">
              {new Date(disaster.created_at).toLocaleDateString()}
            </Text>
          </HStack>
        </HStack>

        {disaster.tags && disaster.tags.length > 0 && (
          <Wrap spacing={1} mb={3}>
            {disaster.tags.slice(0, 3).map((tag, index) => (
              <WrapItem key={index}>
                <Tag 
                  size="sm" 
                  bg={tagBg}
                  color="blue.200"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  fontSize="xs"
                >
                  {tag}
                </Tag>
              </WrapItem>
            ))}
            {disaster.tags.length > 3 && (
              <WrapItem>
                <Tag 
                  size="sm" 
                  bg={tagBg}
                  color="blue.200"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  fontSize="xs"
                >
                  +{disaster.tags.length - 3}
                </Tag>
              </WrapItem>
            )}
          </Wrap>
        )}

        <Divider mb={3} borderColor="gray.600" />

        <HStack spacing={2} mt="auto">
          <Button
            leftIcon={<FaExclamationCircle />}
            colorScheme="blue"
            variant="solid"
            size="xs"
            flex="1"
            onClick={(e) => {
              e.stopPropagation();
              onClick(disaster);
            }}
          >
            View Details
          </Button>
          <Button
            leftIcon={<FaFileAlt />}
            colorScheme="orange"
            variant="outline"
            size="xs"
            flex="1"
            onClick={(e) => {
              e.stopPropagation();
              onReportClick(disaster);
            }}
          >
            Submit Report
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

const ResourceCard = ({ resource }) => {
  const cardBg = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const textColor = useColorModeValue('gray.100', 'gray.100');
  const metaColor = useColorModeValue('gray.400', 'gray.400');

  const getResourceTypeIcon = (type) => {
    // Add icons based on resource type
    const icons = {
      medical: '🏥',
      shelter: '🏠',
      supplies: '📦',
      water: '💧',
      food: '🍲',
      power: '⚡',
      communication: '📡',
      transport: '🚌'
    };
    return icons[type] || '📍';
  };

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
      <HStack spacing={3}>
        <Text fontSize="2xl">{getResourceTypeIcon(resource.type)}</Text>
        <Box flex="1">
          <Text fontWeight="bold" color={textColor}>{resource.name}</Text>
          <Text fontSize="sm" color={metaColor}>{resource.location_name}</Text>
          <Badge 
            colorScheme="blue" 
            mt={2}
            borderRadius="full"
            px={2}
            variant="solid"
          >
            {resource.type}
          </Badge>
          {resource.distance_meters && (
            <Text fontSize="xs" color={metaColor} mt={1}>
              {(resource.distance_meters / 1000).toFixed(2)} km away
            </Text>
          )}
        </Box>
      </HStack>
    </Box>
  );
};

const SocialMediaPost = ({ post }) => {
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
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="bold" fontSize="sm" color={textColor}>@{post.author}</Text>
        <Badge 
          colorScheme={post.priority === 'high' ? 'red' : 'blue'}
          variant="solid"
          borderRadius="full"
        >
          {post.priority}
        </Badge>
      </HStack>
      <Text fontSize="sm" color={textColor}>{post.content}</Text>
      <Text fontSize="xs" color={metaColor} mt={2}>
        {new Date(post.created_at).toLocaleString()}
      </Text>
    </Box>
  );
};

const DisasterList = ({ disasters }) => {
  const [selectedDisaster, setSelectedDisaster] = useState(null);
  const [socialMediaPosts, setSocialMediaPosts] = useState([]);
  const [nearbyResources, setNearbyResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showReportForm, setShowReportForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const modalBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const tagBg = useColorModeValue('blue.50', 'blue.900');

  useEffect(() => {
    socket.on('social_media_updated', (disasterId) => {
      if (selectedDisaster?.id === disasterId) {
        fetchSocialMediaPosts(disasterId);
      }
    });

    socket.on('report_created', ({ disaster_id }) => {
      if (selectedDisaster?.id === disaster_id) {
        fetchSocialMediaPosts(disaster_id);
      }
    });

    return () => {
      socket.off('social_media_updated');
      socket.off('report_created');
    };
  }, [selectedDisaster]);

  const fetchSocialMediaPosts = async (disasterId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/social-media/disaster/${disasterId}`);
      if (!response.ok) throw new Error('Failed to fetch social media posts');
      const data = await response.json();
      setSocialMediaPosts(data);
      return data;
    } catch (error) {
      console.error('Error fetching social media posts:', error);
      setSocialMediaPosts([]);
      throw error;
    }
  };

  const fetchNearbyResources = async (disasterId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/disasters/${disasterId}/resources?radius=5000`
      );
      if (!response.ok) throw new Error('Failed to fetch nearby resources');
      const data = await response.json();
      setNearbyResources(data);
      return data;
    } catch (error) {
      console.error('Error fetching nearby resources:', error);
      setNearbyResources([]);
      throw error;
    }
  };

  const handleDisasterClick = async (disaster) => {
    try {
      setIsLoading(true);
      setSelectedDisaster(disaster);
      setShowReportForm(false);
      setShowResourceForm(false);
      
      await Promise.all([
        fetchSocialMediaPosts(disaster.id),
        fetchNearbyResources(disaster.id)
      ]);

      onOpen();
    } catch (error) {
      console.error('Error loading disaster details:', error);
      // Show error toast or handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportSubmitted = () => {
    if (selectedDisaster) {
      fetchSocialMediaPosts(selectedDisaster.id);
      setShowReportForm(false);
    }
  };

  const handleResourceCreated = () => {
    if (selectedDisaster) {
      fetchNearbyResources(selectedDisaster.id);
      setShowResourceForm(false);
    }
  };

  return (
    <Box>
      <Box mb={6}>
        <Heading size="md" mb={1}>Active Disasters</Heading>
        <Text color="gray.600" fontSize="sm">Monitor and respond to ongoing disasters in your area</Text>
      </Box>

      {Array.isArray(disasters) && disasters.length > 0 ? (
        <SimpleGrid 
          columns={{ base: 1, sm: 2, md: 3, lg: 4 }} 
          spacing={4} 
          w="100%"
        >
          {disasters.map((disaster) => (
            <DisasterCard
              key={disaster.id}
              disaster={disaster}
              onClick={handleDisasterClick}
              onReportClick={() => {
                setSelectedDisaster(disaster);
                setShowReportForm(true);
                onOpen();
              }}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Box 
          textAlign="center" 
          py={8}
          borderWidth="1px"
          borderRadius="lg"
          borderStyle="dashed"
        >
          <Icon as={FaExclamationCircle} w={8} h={8} color="gray.400" mb={3} />
          <Text fontSize="md" color="gray.600">No disasters reported yet.</Text>
          <Text fontSize="sm" color="gray.500">
            Active disasters will appear here when reported.
          </Text>
        </Box>
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={() => {
          onClose();
          setSelectedDisaster(null);
          setShowReportForm(false);
          setShowResourceForm(false);
        }}
        size="xl"
        scrollBehavior="inside"
        isCentered
      >
        <ModalOverlay />
        <ModalContent 
          maxW="800px"
          bg="gray.800"
          borderColor="gray.700"
        >
          {isLoading ? (
            <Box p={8} textAlign="center">
              <Spinner size="xl" color="blue.500" />
              <Text mt={4} color="gray.400">Loading disaster details...</Text>
            </Box>
          ) : (
            <>
              <ModalHeader borderBottomWidth="1px" py={3} borderBottomColor="gray.700">
                <HStack justify="space-between" align="flex-start">
                  <VStack align="flex-start" spacing={2}>
                    <Heading size="md">{selectedDisaster?.title}</Heading>
                    <HStack>
                      <Badge 
                        colorScheme={getPriorityColor(selectedDisaster?.priority)}
                        fontSize="xs"
                        px={2}
                        py={0.5}
                        borderRadius="full"
                      >
                        <HStack spacing={1}>
                          <Icon as={MdPriorityHigh} boxSize="3" />
                          <Text fontSize="xs">{selectedDisaster?.priority?.toUpperCase() || 'UNKNOWN'} PRIORITY</Text>
                        </HStack>
                      </Badge>
                      <Badge 
                        colorScheme={selectedDisaster?.status === 'active' ? 'green' : 'gray'}
                        variant="subtle"
                        borderRadius="full"
                        fontSize="xs"
                      >
                        {selectedDisaster?.status?.toUpperCase()}
                      </Badge>
                    </HStack>
                  </VStack>
                  {!showReportForm && !showResourceForm && (
                    <HStack spacing={2}>
                      <Button
                        leftIcon={<FaFileAlt />}
                        colorScheme="orange"
                        size="sm"
                        onClick={() => setShowReportForm(true)}
                      >
                        Submit Report
                      </Button>
                      <Button
                        leftIcon={<FaHandHoldingHeart />}
                        colorScheme="green"
                        size="sm"
                        onClick={() => setShowResourceForm(true)}
                      >
                        Add Resource
                      </Button>
                    </HStack>
                  )}
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody py={4}>
                <VStack spacing={4} align="stretch">
                  {showReportForm ? (
                    <>
                      <Heading size="sm" mb={2}>Submit New Report</Heading>
                      <ReportForm 
                        disasterId={selectedDisaster?.id} 
                        onReportSubmitted={handleReportSubmitted}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => setShowReportForm(false)}
                        variant="ghost"
                        color="white"
                        _hover={{
                          bg: 'gray.700'
                        }}
                      >
                        Back to Details
                      </Button>
                    </>
                  ) : showResourceForm ? (
                    <>
                      <Heading size="sm" mb={2}>Add New Resource</Heading>
                      <ResourceForm 
                        disasterId={selectedDisaster?.id} 
                        onResourceCreated={handleResourceCreated}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => setShowResourceForm(false)}
                        variant="ghost"
                        color="white"
                        _hover={{
                          bg: 'gray.700'
                        }}
                      >
                        Back to Details
                      </Button>
                    </>
                  ) : (
                    <>
                      <Box>
                        <Text color="gray.600" fontSize="sm" whiteSpace="pre-wrap">
                          {selectedDisaster?.description}
                        </Text>
                        <HStack mt={3} color="gray.500">
                          <Icon as={FaMapMarkerAlt} boxSize="3" />
                          <Text fontSize="sm">{selectedDisaster?.location_name}</Text>
                        </HStack>
                        {selectedDisaster?.tags && selectedDisaster.tags.length > 0 && (
                          <Wrap spacing={2} mt={3}>
                            {selectedDisaster.tags.map((tag, index) => (
                              <WrapItem key={index}>
                                <Tag 
                                  size="sm" 
                                  bg={tagBg}
                                  color="blue.600"
                                  borderRadius="full"
                                  px={2}
                                  py={0.5}
                                  fontSize="xs"
                                >
                                  {tag}
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        )}
                      </Box>

                      <Divider />

                      <Accordion defaultIndex={[0]} allowMultiple>
                        <AccordionItem border="none">
                          <AccordionButton 
                            px={3} 
                            py={2}
                            bg="gray.800"
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <Heading size="sm" color="white">Social Media Updates</Heading>
                            </Box>
                            <AccordionIcon color="gray.400" />
                          </AccordionButton>
                          <AccordionPanel pt={3}>
                            <VStack spacing={4} align="stretch">
                              {socialMediaPosts.length > 0 ? (
                                socialMediaPosts.map((post) => (
                                  <SocialMediaPost key={post.id} post={post} />
                                ))
                              ) : (
                                <Text color="gray.500" textAlign="center" py={4}>
                                  No social media updates available
                                </Text>
                              )}
                            </VStack>
                          </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem border="none" mt={4}>
                          <AccordionButton 
                            px={4} 
                            py={3}
                            bg="gray.800"
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <HStack>
                                <Heading size="sm" color="white">Nearby Resources</Heading>
                                <Button
                                  size="xs"
                                  colorScheme="green"
                                  leftIcon={<FaPlus />}
                                  ml={2}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowResourceForm(true);
                                  }}
                                >
                                  Add
                                </Button>
                              </HStack>
                            </Box>
                            <AccordionIcon color="gray.400" />
                          </AccordionButton>
                          <AccordionPanel pt={4}>
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              {nearbyResources.length > 0 ? (
                                nearbyResources.map((resource) => (
                                  <ResourceCard key={resource.id} resource={resource} />
                                ))
                              ) : (
                                <Text color="gray.500" textAlign="center" py={4}>
                                  No nearby resources found
                                </Text>
                              )}
                            </SimpleGrid>
                          </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem border="none" mt={4}>
                          <AccordionButton 
                            px={4} 
                            py={3}
                            bg="gray.800"
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <Heading size="sm" color="white">Location Map</Heading>
                            </Box>
                            <AccordionIcon color="gray.400" />
                          </AccordionButton>
                          <AccordionPanel pt={4}>
                            <MapView 
                              disasters={[selectedDisaster]} 
                              resources={nearbyResources}
                              center={selectedDisaster?.location?.coordinates ? 
                                [selectedDisaster.location.coordinates[1], selectedDisaster.location.coordinates[0]] :
                                undefined}
                            />
                          </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem border="none" mt={4}>
                          <AccordionButton 
                            px={4} 
                            py={3}
                            bg="gray.800"
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <Heading size="sm" color="white">Official Updates</Heading>
                            </Box>
                            <AccordionIcon color="gray.400" />
                          </AccordionButton>
                          <AccordionPanel pt={4}>
                            <OfficialUpdates disasterId={selectedDisaster?.id} />
                          </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem border="none" mt={4}>
                          <AccordionButton 
                            px={4} 
                            py={3}
                            bg="gray.800"
                            _hover={{ bg: 'gray.700' }}
                            borderRadius="md"
                          >
                            <Box flex="1" textAlign="left">
                              <Heading size="sm" color="white">Reports and Updates</Heading>
                            </Box>
                            <AccordionIcon color="gray.400" />
                          </AccordionButton>
                          <AccordionPanel pt={4}>
                            <Reports disasterId={selectedDisaster?.id} />
                          </AccordionPanel>
                        </AccordionItem>

                      </Accordion>
                    </>
                  )}
                </VStack>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DisasterList; 