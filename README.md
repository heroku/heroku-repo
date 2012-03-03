# heroku repo plugin

This plugin adds some commands to the heroku gem to interact with the app's repo

## Installation

To install:

    $ heroku plugins:install https://github.com/lstoll/heroku-repo.git

## Commands

### Download

    $ heroku repo:download -a appname
    
This will download the applications repo as a tarball.

### gc

    $ heroku repo:gc -a appname
    
This will run a `git gc --agressive` against the applications repo. This is done inside a run procress on the application itself.

### purge_cache

    $ heroku repo:purge_cache -a appname
    
This will delete the contents of the build cache stored in the repository. This is done inside a run process on the application.
