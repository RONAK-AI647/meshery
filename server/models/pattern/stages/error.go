package stages

import "github.com/meshery/meshkit/errors"

const (
	ErrResolveReferenceCode = "meshery-server-1361"
)

func ErrResolveReference(err error) error {
	return errors.New(ErrResolveReferenceCode, errors.Alert, []string{}, []string{err.Error()}, []string{}, []string{})
}
