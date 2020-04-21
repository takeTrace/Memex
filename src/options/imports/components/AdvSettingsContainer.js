import { connect } from 'react-redux'

import AdvSettings from './AdvSettings'
import * as selectors from '../selectors'
import * as actions from '../actions'

const mapStateToProps = state => ({
    allowTypes: selectors.allowTypes(state),
    concurrency: selectors.concurrency(state),
    prevFailedValue: selectors.processErrors(state),
    bookmarkImports: selectors.bookmarkImports(state),
    indexTitle: selectors.indexTitle(state),
})

const mapDispatchToProps = dispatch => ({
    onConcurrencyChange: event =>
        dispatch(actions.setConcurrencyLevel(+event.target.value)),
    onPrevFailedToggle: event =>
        dispatch(actions.setPrevFailed(event.target.checked)),
    onBookmarImportsToggle: event => dispatch(actions.toggleBookmarkImports()),
    onIndexTitleToggle: event => dispatch(actions.toggleIndexTitle()),
})

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AdvSettings)
