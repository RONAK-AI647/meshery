package handlers

import (
	"encoding/json"
	"fmt"

	// "io"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/meshery/meshery/server/internal/sql"
	"github.com/meshery/meshery/server/models"
)

// swagger:route POST /api/user/performance/profiles PerformanceAPI idSavePerformanceProfile
// Handle POST requests for saving performance profile
//
// Save performance profile using the current provider's persistence mechanism
// responses:
// 	200: performanceProfileResponseWrapper

// SavePerformanceProfileHandler will save performance profile using the current provider's persistence mechanism
func (h *Handler) SavePerformanceProfileHandler(
	rw http.ResponseWriter,
	r *http.Request,
	_ *models.Preference,
	_ *models.User,
	provider models.Provider,
) {
	defer func() {
		_ = r.Body.Close()
	}()

	parsedBody := &models.PerformanceProfile{}
	parsedBody.Metadata = make(sql.Map, 0)
	err := json.NewDecoder(r.Body).Decode(&parsedBody)
	if err != nil {
		rw.WriteHeader(http.StatusBadRequest)
		//failed to read request body
		h.log.Error(ErrRequestBody(err))
		fmt.Fprintf(rw, ErrRequestBody(err).Error(), err)
		return
	}

	j, _ := json.Marshal(parsedBody)
	h.log.Info("performance profile is ", string(j))

	token, err := provider.GetProviderToken(r)
	if err != nil {
		//unable to save user config data
		h.log.Error(ErrRecordPreferences(err))
		http.Error(rw, ErrRecordPreferences(err).Error(), http.StatusInternalServerError)
		return
	}

	resp, err := provider.SavePerformanceProfile(token, parsedBody)
	if err != nil {
		obj := "performance profile"
		//fail to save performance profile
		h.log.Error(ErrFailToSave(err, obj))
		http.Error(rw, ErrFailToSave(err, obj).Error(), http.StatusInternalServerError)
		return
	}

	if h.config.PerformanceChannel != nil {
		h.config.PerformanceChannel <- struct{}{}
	}

	rw.Header().Set("Content-Type", "application/json")
	fmt.Fprint(rw, string(resp))
}

// swagger:route GET /api/user/performance/profiles PerformanceAPI idGetPerformanceProfiles
// Handle GET requests for performance profiles
//
// Returns the list of all the performance profiles saved by the current user
//
// ```?order={field}``` orders on the passed field
//
// ```?page={page-number}``` Default page number is 0
//
// ```?pagesize={pagesize}``` Default pagesize is 10
//
// ```?search={profilename}``` If search is non empty then a greedy search is performed
// responses:
// 	200: performanceProfilesResponseWrapper

// GetPerformanceProfilesHandler returns the list of all the performance profiles saved by the current user
// TODO: make sure cert data is not passed along and used only when test are run add a flag to control this
func (h *Handler) GetPerformanceProfilesHandler(
	rw http.ResponseWriter,
	r *http.Request,
	_ *models.Preference,
	_ *models.User,
	provider models.Provider,
) {
	q := r.URL.Query()

	tokenString := r.Context().Value(models.TokenCtxKey).(string)

	resp, err := provider.GetPerformanceProfiles(tokenString, q.Get("page"), q.Get("pagesize"), q.Get("search"), q.Get("order"))
	if err != nil {
		obj := "performance profile"
		//get query performance profile
		h.log.Error(ErrQueryGet(obj))
		http.Error(rw, ErrQueryGet(obj).Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	fmt.Fprint(rw, string(resp))
}

// swagger:route DELETE /api/user/performance/profiles/{id} PerformanceAPI idDeletePerformanceProfile
// Handle Delete requests for performance profiles
//
// Deletes a performance profile with the given id
// responses:
// 	200: noContentWrapper

// DeletePerformanceProfileHandler deletes a performance profile with the given id
func (h *Handler) DeletePerformanceProfileHandler(
	rw http.ResponseWriter,
	r *http.Request,
	_ *models.Preference,
	_ *models.User,
	provider models.Provider,
) {
	performanceProfileID := mux.Vars(r)["id"]

	resp, err := provider.DeletePerformanceProfile(r, performanceProfileID)
	if err != nil {
		obj := "performance profile"
		//fail to delete performance profile
		h.log.Error(ErrFailToDelete(err, obj))
		http.Error(rw, ErrFailToDelete(err, obj).Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	fmt.Fprint(rw, string(resp))
}

// swagger:route GET /api/user/performance/profiles/{id} PerformanceAPI idGetSinglePerformanceProfile
// Handle GET requests for performance results of a profile
//
// Returns single performance profile with the given id
// responses:
//
//	200: performanceProfileResponseWrapper
//
// GetPerformanceProfileHandler fetched the performance profile with the given id
func (h *Handler) GetPerformanceProfileHandler(
	rw http.ResponseWriter,
	r *http.Request,
	_ *models.Preference,
	_ *models.User,
	provider models.Provider,
) {
	performanceProfileID := mux.Vars(r)["id"]

	resp, err := provider.GetPerformanceProfile(r, performanceProfileID)
	if err != nil {
		obj := "performanceProfile"
		//Queury Error performance profile
		h.log.Error(ErrQueryGet(obj))
		http.Error(rw, ErrQueryGet(obj).Error(), http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	fmt.Fprint(rw, string(resp))
}
