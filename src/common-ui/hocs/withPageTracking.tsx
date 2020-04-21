import React from 'react'
import PropTypes from 'prop-types'
import debounce from 'lodash/fp/debounce'

import analytics from 'src/analytics'

/**
 * HOC that adds page tracking to whatever router-connected component.
 *
 * @param {React.Component} componentClass
 * @returns {React.Component}
 */
const withPageTracking = (componentClass: typeof React.Component) =>
    class extends React.Component<any> {
        static propTypes = { location: PropTypes.object.isRequired }
        trackPage: any

        constructor(props) {
            super(props)

            this.trackPage = debounce(100)(this._trackPage)
        }

        componentDidMount() {
            this.trackPage()
        }

        componentDidUpdate({ location: prevLoc }) {
            if (this.props.location !== prevLoc) {
                this.trackPage()
            }
        }

        _trackPage = () =>
            analytics.trackEvent({
                category: 'Global',
                action: 'Page Visit',
                value: document.title,
            })

        render() {
            return React.createElement(componentClass, this.props as any)
        }
    }

export default withPageTracking
