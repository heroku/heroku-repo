# heroku repo plugin

This plugin adds some commands to the heroku gem to interact with the app's repo

## download

    heroku repo:download -a appname
    
This will download the applications repo as a tarball.

## gc

    heroku repo:gc -a appname
    
This will run a `git gc --agressive` against the applications repo. This is done inside a run procress on the application itself.
