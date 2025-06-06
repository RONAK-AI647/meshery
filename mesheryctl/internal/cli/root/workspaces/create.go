// Copyright Meshery Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package workspaces

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/meshery/meshery/mesheryctl/internal/cli/root/config"
	"github.com/meshery/meshery/mesheryctl/pkg/utils"
	"github.com/meshery/meshery/server/models"

	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var createWorkspaceCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new workspace under an organization",
	Long: `Create a new workspace by providing the name, description, and organization ID
Documentation for models can be found at https://docs.meshery.io/reference/mesheryctl/exp/workspace/create`,
	Example: `
// Create a new workspace in an organization
mesheryctl exp workspace create --orgId [orgId] --name [name] --description [description]
`,

	Args: func(cmd *cobra.Command, args []string) error {
		// Check if all three flags are set
		orgIdFlag, _ := cmd.Flags().GetString("orgId")
		nameFlag, _ := cmd.Flags().GetString("name")
		descriptionFlag, _ := cmd.Flags().GetString("description")

		const errorMsg = "[ Organization ID | Workspace name | Workspace description ] aren't specified\n\nUsage: \nmesheryctl  exp workspace --orgId [Organization ID] --name [name] --description [description]\nmesheryctl  exp workspace --help' to see detailed help message"

		if orgIdFlag == "" || nameFlag == "" || descriptionFlag == "" {

			return utils.ErrInvalidArgument(errors.New(errorMsg))
		}

		return nil
	},

	RunE: func(cmd *cobra.Command, args []string) error {
		mctlCfg, err := config.GetMesheryCtl(viper.GetViper())
		if err != nil {
			return utils.ErrLoadConfig(err)
		}

		baseUrl := mctlCfg.GetBaseMesheryURL()
		url := fmt.Sprintf("%s/%s", baseUrl, workspacesApiPath)

		nameFlag, _ := cmd.Flags().GetString("name")
		descriptionFlag, _ := cmd.Flags().GetString("description")
		orgIdFlag, _ := cmd.Flags().GetString("orgId")

		payload := &models.WorkspacePayload{
			Name:           nameFlag,
			Description:    descriptionFlag,
			OrganizationID: orgIdFlag,
		}

		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			utils.Log.Info("Failed to marshal payload")
			return err
		}

		req, err := utils.NewRequest(http.MethodPost, url, bytes.NewBuffer(payloadBytes))
		if err != nil {
			utils.Log.Info("Failed to create request")
			return err
		}

		resp, err := utils.MakeRequest(req)
		if err != nil {
			return err
		}

		if resp.StatusCode == http.StatusCreated {
			utils.Log.Info("Workspace ", nameFlag, " created")
			return nil
		}

		utils.Log.Info("Failed to create ", nameFlag, " workspace")
		return nil
	},
}

func init() {
	createWorkspaceCmd.Flags().StringP("orgId", "o", "", "Organization ID")
	createWorkspaceCmd.Flags().StringP("name", "n", "", "Name of the workspace")
	createWorkspaceCmd.Flags().StringP("description", "d", "", "Description of the workspace")
}
