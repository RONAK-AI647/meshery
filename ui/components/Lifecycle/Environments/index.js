import { useEffect, useRef, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Pagination, PaginationItem } from '@sistent/sistent';
import { withRouter } from 'next/router';
import { debounce } from 'lodash';
import { Delete } from '@mui/icons-material';
import { NoSsr } from '@sistent/sistent';
import { CreateButtonWrapper, BulkActionWrapper } from './styles';
import { ToolWrapper } from '@/assets/styles/general/tool.styles';
import AddIconCircleBorder from '../../../assets/icons/AddIconCircleBorder';
import EnvironmentCard from './environment-card';
import EnvironmentIcon from '../../../assets/icons/Environment';
import { EVENT_TYPES } from '../../../lib/event-types';
import { useNotification } from '../../../utils/hooks/useNotification';
import { RJSFModalWrapper } from '../../General/Modals/Modal';
import _PromptComponent from '../../PromptComponent';
import { EmptyState } from '../General';
import {
  Modal as SisitentModal,
  ModalBody,
  TransferList,
  ModalFooter,
  PrimaryActionButtons,
  createAndEditEnvironmentSchema,
  createAndEditEnvironmentUiSchema,
  ErrorBoundary,
  Button,
  Grid2,
  Typography,
  SearchBar,
  PROMPT_VARIANTS,
} from '@sistent/sistent';
import ConnectionIcon from '../../../assets/icons/Connection';
import { TRANSFER_COMPONENT } from '../../../utils/Enum';
import {
  useAddConnectionToEnvironmentMutation,
  useRemoveConnectionFromEnvironmentMutation,
  useGetEnvironmentConnectionsQuery,
  useGetEnvironmentsQuery,
  useCreateEnvironmentMutation,
  useUpdateEnvironmentMutation,
  useDeleteEnvironmentMutation,
} from '../../../rtk-query/environments';
import { keys } from '@/utils/permission_constants';
import CAN from '@/utils/can';
import DefaultError from '../../General/error-404/index';
import { useSelector } from 'react-redux';
import { updateProgress } from '@/store/slices/mesheryUi';

const ACTION_TYPES = {
  CREATE: 'create',
  EDIT: 'edit',
};

const Environments = () => {
  const { organization } = useSelector((state) => state.ui);
  const [environmentModal, setEnvironmentModal] = useState({
    open: false,
    schema: {},
  });
  const [actionType, setActionType] = useState('');
  const [initialData, setInitialData] = useState({});
  const [editEnvId, setEditEnvId] = useState('');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState('');
  const [selectedEnvironments, setSelectedEnvironments] = useState([]);
  const [assignConnectionModal, setAssignConnectionModal] = useState(false);
  const [connectionAssignEnv, setConnectionAssignEnv] = useState({});
  const [assignedConnections, setAssignedConnections] = useState([]);
  const [connectionsData, setConnectionsData] = useState([]);
  const [connectionsPage, setConnectionsPage] = useState(0);
  const [environmentConnectionsData, setEnvironmentConnectionsData] = useState([]);
  const [connectionsOfEnvironmentPage, setConnectionsOfEnvironmentPage] = useState(0);
  const [skip, setSkip] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [disableTranferButton, setDisableTranferButton] = useState(true);

  const pageSize = 10;
  const connectionPageSize = 25;

  const modalRef = useRef(null);
  const { notify } = useNotification();

  const {
    data: environmentsData,
    isError: isEnvironmentsError,
    error: environmentsError,
  } = useGetEnvironmentsQuery(
    {
      search: search,
      page: page,
      pagesize: pageSize,
      orgId: orgId,
    },
    {
      skip: !orgId ? true : false,
    },
  );

  const [createEnvironment] = useCreateEnvironmentMutation();

  const [updateEnvironment] = useUpdateEnvironmentMutation();

  const [deleteEnvironment] = useDeleteEnvironmentMutation();

  const {
    data: connections,
    isError: isConnectionsError,
    error: connectionsError,
  } = useGetEnvironmentConnectionsQuery(
    {
      environmentId: connectionAssignEnv.id,
      page: connectionsData.length === 0 ? 0 : connectionsPage,
      pagesize: connectionPageSize,
      filter: '{"assigned":false}',
    },
    {
      skip,
    },
  );

  const {
    data: environmentConnections,
    isError: isEnvironmentConnectionsError,
    error: environmentConnectionsError,
  } = useGetEnvironmentConnectionsQuery(
    {
      environmentId: connectionAssignEnv.id,
      page: environmentConnectionsData.length === 0 ? 0 : connectionsOfEnvironmentPage,
      pagesize: connectionPageSize,
    },
    {
      skip,
    },
  );

  const environments = environmentsData?.environments ? environmentsData.environments : [];
  const connectionsDataRtk = connections?.connections ? connections.connections : [];
  const environmentConnectionsDataRtk = environmentConnections?.connections
    ? environmentConnections.connections
    : [];

  useEffect(() => {
    setConnectionsData((prevData) => [...prevData, ...connectionsDataRtk]);
  }, [connections]);

  useEffect(() => {
    setEnvironmentConnectionsData((prevData) => [...prevData, ...environmentConnectionsDataRtk]);
  }, [environmentConnections]);

  useEffect(() => {
    if (isEnvironmentsError) {
      handleError(`Environments Fetching Error: ${environmentsError?.data}`);
    }
    if (isEnvironmentConnectionsError) {
      handleError(
        `Connections of a Environment fetching Error: ${environmentConnectionsError?.data}`,
      );
    }
    if (isConnectionsError) {
      handleError(`Connections fetching Error: ${connectionsError?.data}`);
    }
  }, [
    isEnvironmentsError,
    isEnvironmentConnectionsError,
    isConnectionsError,
    environmentsError,
    environmentConnectionsError,
    connectionsError,
    handleError,
  ]);

  const handleError = (action) => (error) => {
    updateProgress({ showProgress: false });
    notify({
      message: `${action.error_msg}: ${error}`,
      event_type: EVENT_TYPES.ERROR,
      details: error.toString(),
    });
  };

  const handleSuccess = (msg) => {
    updateProgress({ showProgress: false });
    notify({
      message: msg,
      event_type: EVENT_TYPES.SUCCESS,
    });
  };

  useEffect(() => {
    setOrgId(organization?.id);
  }, [organization]);

  const fetchSchema = () => {
    const updatedSchema = {
      schema: createAndEditEnvironmentSchema,
      uischema: createAndEditEnvironmentUiSchema,
    };
    updatedSchema.schema.properties?.organization &&
      ((updatedSchema.schema = {
        ...updatedSchema.schema,
        properties: {
          ...updatedSchema.schema.properties,
          organization: {
            ...updatedSchema.schema.properties.organization,
            enum: [organization?.id],
            enumNames: [organization?.name],
          },
        },
      }),
      (updatedSchema.uischema = {
        ...updatedSchema.uischema,
        organization: {
          ...updatedSchema.uischema.organization,
          ['ui:widget']: 'hidden',
        },
      }));
    setEnvironmentModal({
      open: true,
      schema: updatedSchema,
    });
  };

  const [addConnectionToEnvironmentMutator] = useAddConnectionToEnvironmentMutation();
  const [removeConnectionFromEnvMutator] = useRemoveConnectionFromEnvironmentMutation();

  const addConnectionToEnvironment = async (environmentId, connectionId) => {
    addConnectionToEnvironmentMutator({ environmentId, connectionId });
  };

  const removeConnectionFromEnvironment = (environmentId, connectionId) => {
    removeConnectionFromEnvMutator({ environmentId, connectionId });
  };

  const handleEnvironmentModalOpen = (e, actionType, envObject) => {
    e.stopPropagation();
    if (actionType === ACTION_TYPES.EDIT) {
      setActionType(ACTION_TYPES.EDIT);
      setInitialData({
        name: envObject.name,
        description: envObject.description,
        organization: envObject.organization_id,
      });
      setEditEnvId(envObject.id);
    } else {
      setActionType(ACTION_TYPES.CREATE);
      setInitialData({
        name: undefined,
        description: '',
        organization: orgId,
      });
      setEditEnvId('');
    }
    fetchSchema();
  };

  const handleEnvironmentModalClose = () => {
    setEnvironmentModal({
      open: false,
      schema: {},
    });
    setActionType('');
  };

  const handleCreateEnvironment = ({ organization, name, description }) => {
    createEnvironment({
      environmentPayload: {
        name: name,
        description: description,
        organization_id: organization,
      },
    })
      .unwrap()
      .then(handleSuccess(`Environment "${name}" created `))
      .catch((error) => handleError(`Environment Create Error: ${error?.data}`));
    handleEnvironmentModalClose();
  };

  const handleEditEnvironment = ({ name, description }) => {
    updateEnvironment({
      environmentId: editEnvId,
      environmentPayload: {
        name: name,
        description: description,
        organization_id: initialData.organization,
      },
    })
      .unwrap()
      .then(handleSuccess(`Environment "${name}" updated`))
      .catch((error) => handleError(`Environment Update Error: ${error?.data}`));
    handleEnvironmentModalClose();
  };

  const handleDeleteEnvironmentConfirm = async (e, environment) => {
    e.stopPropagation();
    let response = await modalRef.current.show({
      title: `Delete "${environment.name}" environment?`,
      subtitle: deleteEnvironmentModalContent(environment.name),
      primaryOption: 'DELETE',
      showInfoIcon: `Deleting an environment does not delete any resources (e.g. connections) currently contained with the environment.
      Resources that belong to others environments will continue to belong to those other environments.
      Learn more about the behavior of [lifecycle of environments and their resources](https://docs.meshery.io/concepts/logical/environments) in Meshery Docs.`,
      variant: PROMPT_VARIANTS.DANGER,
    });
    if (response === 'DELETE') {
      handleDeleteEnvironment(environment.id);
    }
  };

  const handleDeleteEnvironment = (id) => {
    deleteEnvironment({
      environmentId: id,
    })
      .unwrap()
      .then(handleSuccess(`Environment deleted`))
      .catch((error) => handleError(`Environment Delete Error: ${error?.data}`));
  };

  const deleteEnvironmentModalContent = (environment) => (
    <>
      <p>Are you sure you want to delete this environment? (This action is irreversible)</p>
      <p>
        `Environment Name: `
        <i>
          <b>{environment}</b>
        </i>
      </p>
    </>
  );

  const handleBulkSelect = (e, id) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setSelectedEnvironments([...selectedEnvironments, id]);
    } else {
      const newSelectedEnv = selectedEnvironments.filter((env) => env !== id);
      setSelectedEnvironments(newSelectedEnv);
    }
  };

  const handleBulkDeleteEnvironmentConfirm = async (e) => {
    e.stopPropagation();
    let response = await modalRef.current.show({
      title: `Delete Environment(s) ?`,
      subtitle: `Do you want to delete ${selectedEnvironments.length} environment(s) ?`,
      primaryOption: 'DELETE',
      variant: PROMPT_VARIANTS.DANGER,
    });
    if (response === 'DELETE') {
      handleBulkDeleteEnv();
    }
  };

  const handleBulkDeleteEnv = () => {
    selectedEnvironments.map((envId) => {
      handleDeleteEnvironment(envId);
    });
    setSelectedEnvironments([]);
  };

  const handleAssignConnection = () => {
    const { addedConnectionsIds, removedConnectionsIds } =
      getAddedAndRemovedConnection(assignedConnections);

    addedConnectionsIds.map((id) => addConnectionToEnvironment(connectionAssignEnv.id, id));

    removedConnectionsIds.map((id) => removeConnectionFromEnvironment(connectionAssignEnv.id, id));
    setEnvironmentConnectionsData([]);
    setConnectionsData([]);
    handleonAssignConnectionModalClose();
  };

  const handleonAssignConnectionModalOpen = (e, environment) => {
    e.stopPropagation();
    setAssignConnectionModal(true);
    if (connectionAssignEnv.id !== environment.id) {
      setConnectionsData([]);
      setEnvironmentConnectionsData([]);
    }
    setConnectionAssignEnv(environment);
    setSkip(false);
  };

  const handleonAssignConnectionModalClose = () => {
    setAssignConnectionModal(false);
    setSkip(true);
  };

  const handleAssignConnectionData = (updatedAssignedData) => {
    const { addedConnectionsIds, removedConnectionsIds } =
      getAddedAndRemovedConnection(updatedAssignedData);
    (addedConnectionsIds.length > 0 || removedConnectionsIds.length) > 0 &&
    (CAN(
      keys.ASSIGN_CONNECTIONS_TO_ENVIRONMENT.action,
      keys.ASSIGN_CONNECTIONS_TO_ENVIRONMENT.subject,
    ) ||
      CAN(
        keys.REMOVE_CONNECTIONS_FROM_ENVIRONMENT.action,
        keys.REMOVE_CONNECTIONS_FROM_ENVIRONMENT.subject,
      ))
      ? setDisableTranferButton(false)
      : setDisableTranferButton(true);

    setAssignedConnections(updatedAssignedData);
  };

  const getAddedAndRemovedConnection = (allAssignedConnections) => {
    const originalConnectionsIds = environmentConnectionsData.map((conn) => conn.id);
    const updatedConnectionsIds = allAssignedConnections.map((conn) => conn.id);

    const addedConnectionsIds = updatedConnectionsIds.filter(
      (id) => !originalConnectionsIds.includes(id),
    );
    const removedConnectionsIds = originalConnectionsIds.filter(
      (id) => !updatedConnectionsIds.includes(id),
    );

    return {
      addedConnectionsIds,
      removedConnectionsIds,
    };
  };

  const handleAssignablePage = () => {
    const pagesCount = parseInt(Math.ceil(parseInt(connections?.total_count) / connectionPageSize));
    if (connectionsPage < pagesCount - 1) {
      setConnectionsPage((prevConnectionsPage) => prevConnectionsPage + 1);
    }
  };

  const handleAssignedPage = () => {
    const pagesCount = parseInt(
      Math.ceil(parseInt(environmentConnections?.total_count) / connectionPageSize),
    );
    if (connectionsOfEnvironmentPage < pagesCount - 1) {
      setConnectionsOfEnvironmentPage(
        (prevConnectionsOfEnvironmentPage) => prevConnectionsOfEnvironmentPage + 1,
      );
    }
  };

  return (
    <NoSsr>
      {CAN(keys.VIEW_ENVIRONMENTS.action, keys.VIEW_ENVIRONMENTS.subject) ? (
        <>
          <ToolWrapper>
            <CreateButtonWrapper>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                onClick={(e) => handleEnvironmentModalOpen(e, ACTION_TYPES.CREATE)}
                sx={{
                  padding: '8px',
                  borderRadius: '5px',
                  marginRight: '2rem',
                }}
                disabled={!CAN(keys.CREATE_ENVIRONMENT.action, keys.CREATE_ENVIRONMENT.subject)}
                data-cy="btnResetDatabase"
              >
                <AddIconCircleBorder sx={{ width: '20px', height: '20px' }} />
                <Typography
                  sx={{
                    paddingLeft: '4px',
                    marginRight: '4px',
                  }}
                >
                  Create
                </Typography>
              </Button>
            </CreateButtonWrapper>
            <SearchBar
              onSearch={(value) => {
                setSearch(value);
              }}
              placeholder="Search Environments..."
              expanded={isSearchExpanded}
              setExpanded={setIsSearchExpanded}
            />
          </ToolWrapper>
          {selectedEnvironments.length > 0 && (
            <BulkActionWrapper>
              <Typography>
                {selectedEnvironments.length > 1
                  ? `${selectedEnvironments.length} environments selected`
                  : `${selectedEnvironments.length} environment selected`}
              </Typography>
              <Button>
                <Delete
                  sx={{ color: 'red', margin: '0 2px' }}
                  onClick={handleBulkDeleteEnvironmentConfirm}
                  disabled={
                    selectedEnvironments.length > 0
                      ? !CAN(keys.DELETE_ENVIRONMENT.action, keys.DELETE_ENVIRONMENT.subject)
                      : true
                  }
                />
              </Button>
            </BulkActionWrapper>
          )}
          {environments.length > 0 ? (
            <>
              <Grid2 container spacing={2} sx={{ marginTop: '10px' }} size="grow">
                {environments.map((environment) => (
                  <Grid2 key={environment.id} size={{ xs: 12, md: 6 }}>
                    <EnvironmentCard
                      // classes={classes}
                      environmentDetails={environment}
                      selectedEnvironments={selectedEnvironments}
                      onEdit={(e) => handleEnvironmentModalOpen(e, ACTION_TYPES.EDIT, environment)}
                      onDelete={(e) => handleDeleteEnvironmentConfirm(e, environment)}
                      onSelect={(e) => handleBulkSelect(e, environment.id)}
                      onAssignConnection={(e) => handleonAssignConnectionModalOpen(e, environment)}
                    />
                  </Grid2>
                ))}
              </Grid2>
              <Grid2
                container
                sx={{ padding: '2rem 0', marginTop: '20px' }}
                flex
                justifyContent="center"
                spacing={2}
                size="grow"
              >
                <Pagination
                  count={Math.ceil(environmentsData?.total_count / pageSize)}
                  page={page + 1}
                  onChange={debounce((_, page) => setPage(page - 1), 150)}
                  boundaryCount={3}
                  renderItem={(item) => (
                    <PaginationItem
                      slots={{ previous: ChevronLeftIcon, next: ChevronRightIcon }}
                      {...item}
                    />
                  )}
                />
              </Grid2>
            </>
          ) : (
            <EmptyState
              icon={
                <EnvironmentIcon
                  height="6rem"
                  width="6rem"
                  fill="#808080"
                  secondaryFill="#979797"
                />
                // TODO: replace all fill and secondary fill hex values with sistent tokens
              }
              message="No environment available"
              pointerLabel="Click “Create” to establish your first environment."
            />
          )}
          {(CAN(keys.CREATE_ENVIRONMENT.action, keys.CREATE_ENVIRONMENT.subject) ||
            CAN(keys.EDIT_ENVIRONMENT.action, keys.EDIT_ENVIRONMENT.subject)) &&
            environmentModal.open && (
              <SisitentModal
                open={environmentModal.open}
                closeModal={handleEnvironmentModalClose}
                title={
                  actionType === ACTION_TYPES.CREATE ? 'Create Environment' : 'Edit Environment'
                }
              >
                <RJSFModalWrapper
                  schema={environmentModal.schema.schema}
                  uiSchema={environmentModal.schema.uischema}
                  handleSubmit={
                    actionType === ACTION_TYPES.CREATE
                      ? handleCreateEnvironment
                      : handleEditEnvironment
                  }
                  submitBtnText={actionType === ACTION_TYPES.CREATE ? 'Save' : 'Update'}
                  initialData={initialData}
                  handleClose={handleEnvironmentModalClose}
                />
              </SisitentModal>
            )}
          <SisitentModal
            open={assignConnectionModal}
            closeModal={handleonAssignConnectionModalClose}
            title={`${connectionAssignEnv.name} Resources`}
            headerIcon={<EnvironmentIcon height="2rem" width="2rem" fill="white" />}
            maxWidth="md"
          >
            <ModalBody>
              <TransferList
                name="Connections"
                assignableData={connectionsData}
                assignedData={handleAssignConnectionData}
                originalAssignedData={environmentConnectionsData}
                emptyStateIconLeft={
                  <ConnectionIcon width="120" primaryFill="#808080" secondaryFill="#979797" />
                }
                emtyStateMessageLeft="No connections available"
                emptyStateIconRight={
                  <ConnectionIcon width="120" primaryFill="#808080" secondaryFill="#979797" />
                }
                emtyStateMessageRight="No connections assigned"
                transferComponentType={TRANSFER_COMPONENT.CHIP}
                assignablePage={handleAssignablePage}
                assignedPage={handleAssignedPage}
                originalLeftCount={connections?.total_count}
                originalRightCount={environmentConnections?.total_count}
                leftPermission={CAN(
                  keys.REMOVE_CONNECTIONS_FROM_ENVIRONMENT.action,
                  keys.REMOVE_CONNECTIONS_FROM_ENVIRONMENT.subject,
                )}
                rightPermission={CAN(
                  keys.ASSIGN_CONNECTIONS_TO_ENVIRONMENT.action,
                  keys.ASSIGN_CONNECTIONS_TO_ENVIRONMENT.subject,
                )}
              />
            </ModalBody>
            <ModalFooter variant="filled" helpText="Assign connections to environment">
              <PrimaryActionButtons
                primaryText="Save"
                secondaryText="Cancel"
                primaryButtonProps={{
                  onClick: handleAssignConnection,
                  disabled: disableTranferButton,
                }}
                secondaryButtonProps={{
                  onClick: handleonAssignConnectionModalClose,
                }}
              />
            </ModalFooter>
          </SisitentModal>
          <_PromptComponent ref={modalRef} />
        </>
      ) : (
        <DefaultError />
      )}
    </NoSsr>
  );
};

const EnvironmentsPageWithErrorBoundary = (props) => {
  return (
    <NoSsr>
      <ErrorBoundary>
        <Environments {...props} />
      </ErrorBoundary>
    </NoSsr>
  );
};

export default withRouter(EnvironmentsPageWithErrorBoundary);
